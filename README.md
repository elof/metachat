# MetaChat Application

MetaChat is a real-time chat application that allows users to create rooms and communicate with others.It's built with Macrometa Document stores with Streams enabled and Node. To take full advantage of the distributed nature of Macrometa for low latency and high throughput, the application can use Edge Workers in place of a centralized Node server.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js
- npm or yarn
- Git

### Installing

1. Clone the repository:

```bash
git clone https://github.com/elof/MetaChat.git
```

Navigate to the project directory:

```bash
cd MetaChat
```

Install dependencies:

```bash
npm install
```
or if you are using yarn:

```bash
yarn install
```

Set up environment variables:

Create a .env file in the root directory and add the following:

```
MACROMETA_API_KEY=your_macrometa_api_key
```

Run the application:
```bash
npm start
```
or if you are using yarn:

```bash
yarn start
```
Open your browser and navigate to:

`http://localhost:3000`

Usage

Create a chat room by entering a room name and your username.

Share the room URL with others to join the same chat room.

Type your messages and hit send or press enter to communicate.