module.exports = {
  apps: [
    {
      name: "backend",
      script: "cmd",
      args: "/c env\\Scripts\\python.exe backend/manage.py runserver 0.0.0.0:8000",
      cwd: "./"
    },
    {
      name: "frontend",
      script: "cmd",
      args: "/c npm run dev",
      cwd: "./frontend"
    }
  ]
};