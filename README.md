# Social Media Bot for LinkedIn Interactions

This project is a social media bot designed to automate likes, comments, and other interactions on LinkedIn posts using Puppeteer. It interacts with company posts, using credentials and other settings provided in the `.env` file. The bot leverages Puppeteer stealth mode to avoid detection and simulates user activity on the LinkedIn platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before running this project, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/get-npm)

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/AttockOffice85/node-websurfer.git
    ```

2. Navigate to the project directory:

    ```bash
    cd node-websurfer
    ```

3. Checkout to multi-users branch:

    ```bash
    git checkout multi-users
    ```

4. Go to backend

    ```bash
    cd backend
    ```

4.1. Set up the environment variables:

    Create a `.env` file in the root directory of the backend dir based on the `.env.example` file provided.

    Example `.env` file:
    ```env
    HEADLESS_BROWSER=true
    NO_OF_COMPANY_POSTS=5
    NO_OF_RANDOM_POSTS=5
    NO_OF_BOTS=2
    BOTS_NO_OF_RETRY_CRASH=2
    SERVER_PORT=8080
    ```

4.2. Install the required dependencies and run the backend server:

    ```bash
    npm install
    ```
    
    ```bash
    npm run dev
    ```

5. Go to frontend

    ```bash
    cd frontend
    ```

5.1. Set up the environment variables:

    Create a `.env` file in the root directory of the frontend dir based on the `.env.example` file provided.

    Example `.env` file:
    ```env
    REACT_APP_API_URL=http://localhost:8080
    ```
    
5.2. Install the required dependencies and run the frontend server:

    ```bash
    npm install
    ```

    ```bash
    npm run start
    ```

## Environment Variables

The following environment variables are required for the bot to function:

- **`HEADLESS_BROWSER`**: Puppeteer browser will not show up on screen if this variable is set to _true_.
- **`BOTS_NO_OF_RETRY_CRASH`**: The number of times a bot can retry in case of any issue.
- **`NO_OF_COMPANY_POSTS`**: The number of company posts to interact with during each bot run.
- **`NO_OF_RANDOM_POSTS`**: The number of posts on home to interact with during each bot run.
- **`NO_OF_BOTS`**: Set no of bots equal to no of users defined in the users-data.json file.
- **`SERVER_PORT`**: Set port to 8080.
- **`REACT_APP_API_URL`**: do not add ' / ' at the end of backend url

## Usage

### Running the bot in development mode

<http://localhost:3000> for frontend
