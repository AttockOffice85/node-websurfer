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

2. Go to backend

    ```bash
    cd backend
    ```

2.1. Set up the environment variables:

    Create a `.env` file in the root directory of the project based on the `.env.example` file provided.

    Example `.env` file:
    ```env
    LINKEDIN_USERNAME='your-linkedin-username'
    LINKEDIN_PASSWORD='your-linkedin-password'
    HUGGING_FACE_API_KEY='your-huggingface-api-key'
    NO_OF_COMPANY_POSTS=5
    NO_OF_RANDOM_POSTS=5
    ```

2.2. Install the required dependencies and run the backend server:

    ```bash
    npm install
    ```
    
    ```bash
    npm run dev
    ```

3. Go to frontend

    ```bash
    cd frontend
    ```
    
3.1. Install the required dependencies and run the frontend server:

    ```bash
    npm install
    ```

    ```bash
    npm run start
    ```

## Environment Variables

The following environment variables are required for the bot to function:

- **`LINKEDIN_USERNAME`**: Your LinkedIn account username.
- **`LINKEDIN_PASSWORD`**: Your LinkedIn account password.
- **`HUGGING_FACE_API_KEY`**: An API key from Hugging Face for comment generation or sentiment analysis.
- **`NO_OF_COMPANY_POSTS`**: The number of company posts to interact with during each bot run.
- **`NO_OF_RANDOM_POSTS`**: The number of posts on home to interact with during each bot run.

## Usage

### Running the bot in development mode

http://localhost:3000 for frontend
