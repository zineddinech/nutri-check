# Nutri-Check Full Stack Application
This project is a full-stack web application featuring a **React** frontend, a **FastAPI** backend, and a **MongoDB** database. The entire development environment is containerized using **Docker** and orchestrated with **Docker Compose**, ensuring consistency and ease of setup.

---

## Architecture Overview
The application is composed of three separate services that communicate over a shared Docker network. This microservices-oriented approach ensures that each part of the application is independent, scalable, and maintainable.

* **client**: A **React (Vite)** single-page application that provides the user interface. It runs in its own container using a multi-stage Docker build with **Nginx** to serve the static files in production.
* **server**: A Python **FastAPI** application that serves the backend API. It handles business logic and communicates with the database.
* **mongo**: A **MongoDB** database instance running in its own container. Data is persisted on the host machine using a named Docker volume.

---

## Prerequisites
Before you begin, ensure you have the following installed on your system:

* [**Docker**](https://www.docker.com/get-started)
* [**Docker Compose**](https://docs.docker.com/compose/install/)

---

## Getting Started (Local Development)
This will set up the entire application stack on your local machine. By default, it uses a small, 1000-document sample dataset for a fast and efficient startup.

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd nutri-check
    ```

2.  **Build and Start the Services:**
    Run the following command from the project root directory.
    ```bash
    docker-compose up --build -d
    ```
    > **Note:** Use the `--build` flag the first time you run this command or after you've made changes that affect the build, like modifying a `Dockerfile` or `pyproject.toml`.

3.  **Access the Application:**
    Once the containers are up and running, you can access the services:
    * Frontend Application: [http://localhost:5173](http://localhost:5173)
    * Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Development Workflow & Tips

### Verifying the Database
After starting the services, you can directly inspect the MongoDB container to verify that the data has been imported correctly.

1.  **Access the Mongo Shell:**
    This command opens an interactive shell inside the running `mongo` container.
    ```bash
    docker-compose exec mongo mongosh
    ```

2.  **Run Commands Inside Mongosh:**
    Once inside the shell, you can run standard MongoDB commands.
    ```javascript
    // Switch to your application's database
    use nutridb;

    // Show all collections in the database
    show collections;
    // You should see the 'products' collection listed.

    // Inspect one document to confirm the data structure
    db.products.findOne();

    // Count the total number of documents
    db.products.countDocuments();
    // This should return 1000 when using the sample dataset.
    ```

### Updating the Application (Hot-Reloading)
The development environment is configured for a very efficient workflow.

* **For Python Code Changes (`.py` files):**
  You **do not need to run any `docker-compose` commands**. Simply **save your changes** in your code editor. The `server` container's Uvicorn process is running with `--reload`, so it will automatically detect the change and restart the application. You can just refresh your browser. To monitor this, watch the server logs:
    ```bash
    docker-compose logs -f server
    ```

* **When to Rebuild:**
  You only need to stop (`docker-compose down`) and rebuild the services with `docker-compose up --build -d` when you make changes to:
    * A `Dockerfile`.
    * Project dependencies (e.g., adding a new library in `pyproject.toml`).

---

## Data Management
The database initialization script (`mongo-init/init-mongo.sh`) is designed to be flexible, allowing you to easily switch between a small sample dataset for development and the full dataset for testing or demonstrations.

### Development Data (Default)
By default, the environment uses `mongo-init/dev-sample.gz`. This is automatically restored on the first launch, making the initial setup very fast.

### Switching to the Full Dataset
To run the application with the complete Open Food Facts dataset, follow these steps:

1.  **Clean Up the Old Environment:**
    It is crucial to remove the old containers **AND** the persistent data volume to ensure a fresh start.
    ```bash
    docker-compose down -v
    ```

2.  **Create a `.env` file:**
    In the project's root directory, create a file named `.env`.

3.  **Configure the Data Source URL:**
    Add the following line to the `.env` file. The `init-mongo.sh` script will detect this environment variable and download the data from this URL instead of using the local sample.
    ```
    DATA_SOURCE_URL=https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz
    ```

4.  **Start the Environment Again:**
    Run the `up` command again. This time, the `mongo` container will take a significant amount of time to start as it downloads and restores the entire database.
    ```bash
    docker-compose up --build -d
    ```

---

## Common Docker Compose Commands
Here are some useful commands for managing your development environment:

* `docker-compose up --build -d`: Build images from scratch and start all services in the background.
* `docker-compose up -d`: Start all services in the background without rebuilding images (for daily work when code is unchanged).
* `docker-compose down`: Stop and remove all containers and the network.
* `docker-compose down -v`: **Warning:** Stops everything **AND** deletes the database volume.
* `docker-compose ps`: List the status of all services.
* `docker-compose logs -f <service_name>`: View the real-time logs for a specific service (e.g., `server` or `client`).
* `docker-compose build <service_name>`: Rebuild the image for a specific service without starting it.

---

## CI/CD & Deployment
This project is configured with separate **CI/CD pipelines** for the `client` and `server`. When changes are pushed to the `main` branch:

1.  A pipeline is triggered based on the directory (`client/` or `server/`) where changes occurred.
2.  The pipeline lints, tests, and builds a production-ready Docker image for the specific service.
3.  The new image is pushed to **Docker Hub**.

This local Docker Compose setup is for development and testing only and is distinct from the production deployment process.

---

## Demonstration Setup
This section describes how to set up the application for a demonstration, where the database runs as a persistent service on one machine (the "**DB Machine**") and the applications can be run from any other machine.

### Part 1: On the Database Server Machine
The goal is to prepare a standalone MongoDB service with the full dataset.

1.  **Prepare Files:** Copy the `docker-compose.yml`, the `mongo-init/` directory, and the `.env` file (configured with the full data URL) to this machine.
2.  **Start the Database Service:** Run the following command in the terminal. This will start **only the `mongo` service** in the background and begin the data download and restoration process.
    ```bash
    docker-compose up -d mongo
    ```
3.  **Get the Machine's IP Address:** Find the local IP address of this machine (e.g., `192.168.1.100`). You will need this for the next step. The `ports: - "27017:27017"` configuration in the compose file makes the database accessible over the network.

### Part 2: On the Application Machine
On any machine with Docker (it can be the same machine or another one on the same network), you can now run the server and client applications by pulling their images from **Docker Hub**.

1.  **Run the Server Container:**
    Open a terminal and run the command below. Replace `<DB_MACHINE_IP>` with the IP address from the previous step and `<your-dockerhub-username>` with your actual Docker Hub username.
    ```bash
    docker run -d -p 8000:8000 \
      -e MONGO_URI="mongodb://<DB_MACHINE_IP>:27017" \
      -e MONGO_DB_NAME="nutridb" \
      --name my_server_instance \
      <your-dockerhub-username>/nutri-server:latest
    ```

2.  **Run the Client Container:**
    Similarly, run the client container. Note that you may need to pass the server's URL as an environment variable, depending on your client's configuration (e.g., `-e VITE_API_URL=...`).
    ```bash
    docker run -d -p 5173:80 \
      --name my_client_instance \
      <your-dockerhub-username>/nutri-client:latest
    ```
With this setup, your application is now running in a distributed fashion, which is a closer simulation of a real-world production environment.