from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import UserProfile, PasswordResetOTP
from .serializers import UserSerializer, RegisterSerializer
from .telegram_service import send_otp_via_telegram, generate_otp
from apps.portfolio.models import Portfolio
from apps.portfolio.serializers import PortfolioSerializer


def _get_tokens_for_user(user):
    """Generate JWT access + refresh tokens for the given user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    user = User.objects.create_user(
        username=data['username'],
        email=data['email'],
        password=data['password']
    )
    UserProfile.objects.create(
        user=user,
        telegram_chat_id=data.get('telegram_chat_id', '') or '',
        telegram_handle=data.get('telegram_handle', '') or '',
    )
    tokens = _get_tokens_for_user(user)
    return Response({**tokens, 'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    if not email or not password:
        return Response({'detail': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(username=user_obj.username, password=password)
    if not user:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
    tokens = _get_tokens_for_user(user)
    return Response({**tokens, 'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except TokenError:
        pass
    return Response({'detail': 'Logged out'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    return Response(UserSerializer(request.user).data)


# ─── MPIN ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_mpin(request):
    """Set or change the user's 6-digit MPIN."""
    mpin = str(request.data.get('mpin', '')).strip()
    if len(mpin) != 6 or not mpin.isdigit():
        return Response({'detail': 'MPIN must be exactly 6 digits.'}, status=status.HTTP_400_BAD_REQUEST)
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.set_mpin(mpin)
    return Response({'detail': 'MPIN set successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_mpin(request):
    """Verify the user's MPIN. Returns mpin_valid: true/false."""
    mpin = str(request.data.get('mpin', '')).strip()
    profile = getattr(request.user, 'profile', None)
    if not profile or not profile.mpin_set:
        return Response({'detail': 'MPIN not set.', 'mpin_valid': False}, status=status.HTTP_400_BAD_REQUEST)
    valid = profile.check_mpin(mpin)
    if valid:
        return Response({'mpin_valid': True, 'detail': 'MPIN verified.'})
    return Response({'mpin_valid': False, 'detail': 'Incorrect MPIN.'}, status=status.HTTP_400_BAD_REQUEST)


# ─── ADMIN ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_list(request):
    """Admin: list all users with their portfolio summaries."""
    users = User.objects.select_related('profile').prefetch_related('portfolios').all().order_by('id')
    result = []
    for u in users:
        profile = getattr(u, 'profile', None)
        portfolios = Portfolio.objects.filter(user=u)
        result.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'is_staff': u.is_staff,
            'telegram_handle': profile.telegram_handle if profile else None,
            'telegram_chat_id': profile.telegram_chat_id if profile else None,
            'date_joined': u.date_joined,
            'portfolio_count': portfolios.count(),
            'portfolios': [{'id': p.id, 'name': p.name, 'created_at': p.created_at} for p in portfolios],
        })
    return Response(result)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_portfolio(request, portfolio_id):
    """Admin: delete any user's portfolio."""
    try:
        portfolio = Portfolio.objects.get(id=portfolio_id)
    except Portfolio.DoesNotExist:
        return Response({'detail': 'Portfolio not found.'}, status=status.HTTP_404_NOT_FOUND)
    portfolio.delete()
    return Response({'detail': 'Portfolio deleted.'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_portfolios(request, user_id):
    """Admin: get all portfolios + holdings for a specific user."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    portfolios = Portfolio.objects.filter(user=user).prefetch_related('holdings__stock')
    return Response({
        'user': UserSerializer(user).data,
        'portfolios': PortfolioSerializer(portfolios, many=True).data,
    })


# ─── PASSWORD RESET ───────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Step 1 of password reset:
    - User provides their email
    - Backend finds the account, generates a 6-digit OTP, and sends it to
      the user's Telegram Chat ID stored in their profile
    """
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'detail': 'If this email is registered, an OTP will be sent to your Telegram.'})

    profile = getattr(user, 'profile', None)
    if not profile or not profile.telegram_chat_id:
        return Response(
            {'detail': 'No Telegram Chat ID is linked to this account. Please contact support.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    PasswordResetOTP.objects.filter(user=user, is_used=False).delete()

    otp = generate_otp()
    PasswordResetOTP.objects.create(user=user, otp_code=otp)

    sent = send_otp_via_telegram(profile.telegram_chat_id, otp)
    if not sent:
        return Response(
            {'detail': 'Failed to send OTP via Telegram. Please ensure you have started a chat with our bot.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    return Response({'detail': 'OTP sent to your Telegram. It expires in 10 minutes.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Step 2 of password reset:
    - User provides email, the OTP they received, and their new password
    - Backend verifies the OTP and updates the password
    """
    email = (request.data.get('email') or '').strip().lower()
    otp_code = (request.data.get('otp') or '').strip()
    new_password = request.data.get('new_password') or ''

    if not email or not otp_code or not new_password:
        return Response({'detail': 'Email, OTP, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 4:
        return Response({'detail': 'Password must be at least 4 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'detail': 'Invalid email or OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_obj = PasswordResetOTP.objects.filter(
        user=user,
        otp_code=otp_code,
        is_used=False
    ).order_by('-created_at').first()

    if not otp_obj:
        return Response({'detail': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    if otp_obj.is_expired():
        return Response({'detail': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    otp_obj.is_used = True
    otp_obj.save()

    return Response({'detail': 'Password reset successful. Please log in with your new password.'})
