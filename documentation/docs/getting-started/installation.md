---
title: QELOS Installation and Setup Guide
editLink: true

---

# {{ $frontmatter.title }}

## Prerequisites

Before you start, ensure you have the following software installed on your system:

- **Node.js v20+**: The JavaScript runtime environment required to run QELOS.

- **Docker**: A platform for developing, shipping, and running applications in containers.

- **Code Editor**: A code editor is needed for development. We recommend **Visual Studio Code**, but you may use any editor or IDE of your choice.

- **MongoDB GUI**: A graphical tool for managing MongoDB databases. Popular options include **Studio 3T** and **MongoDB Compass**, but you can choose any MongoDB GUI tool or use **MongoDB Atlas**.

## Recommended Software for Daily work

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
   <a href="https://nodejs.org/" target="_blank">
      <img src="/nodeJS-logo.png" alt="Node.js Logo" style="width: 100px; height: auto;">
    </a>
    <p><strong>Node.js v20+</strong></p>
    <p>The JavaScript runtime environment needed to run QELOS.</p>
	
  </div>

<div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <a href="https://www.docker.com/get-started" target="_blank">
      <img src="/docker-logo.png" alt="Docker Logo" style="width: 100px; height: auto;">
    </a>
    <p><strong>Docker</strong></p>
    <p>A platform for developing, shipping, and running applications in containers.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
   <a href="https://code.visualstudio.com/" target="_blank">
      <img src="/vs-code-logo.png" alt="VS Code Logo" style="width: 100px; height: auto;">
    </a>
    <p><strong>VS Code</strong></p>
    <p>A versatile code editor for development and debugging.</p>
  </div>

 <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
 <a href="https://www.mongodb.com/products/compass" target="_blank">
      <img src="/mongodb-compass-logo.png" alt="MongoDB Compass Logo" style="width: 100px; height: auto;">
    </a>
    <p><strong>MongoDB Compass</strong></p>
       <p>A GUI for managing MongoDB databases. You can use MongoDB Compass or any other GUI of your choice.</p>
  </div>

</div>

## Installation Steps

Follow these steps to set up QELOS on your local machine:

### 1. Clone the Repository

Download the QELOS repository from GitHub and navigate into the project directory:

```bash
git clone https://github.com/qelos-io/qelos
```

### 2. Install Dependencies to the root directory of the project:

Install the necessary npm packages:

```bash
pnpm install
```

### 3. Build the Project

Compile the project with the build command:

```bash
pnpm build
```

### 4. Start the Development Server

Run the development server to start the application:

```bash
pnpm dev
```

### 5. Populate the Database with Initial Data

For macOS or Linux users: Run the command:

```bash
pnpm run populate-db
```
For Windows users: Run the command:

```bash
USERNAME=test@test.com pnpm run populate-db
```

### 6. Access the Application

Open your web browser and navigate to:

```bash
http://localhost:3000/
```

### 7. Use the following credentials to log in:

| **Field**    | **Value**       |
| ------------ | --------------- |
| **Username** | `test@test.com` |
| **Password** | `admin`         |
