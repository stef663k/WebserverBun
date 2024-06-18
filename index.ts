import { serve, WebSocket } from "bun";
import jwt from "jsonwebtoken";

let clients: Set<WebSocket> = new Set();

const server = serve({
  port: 42069,
  fetch: async (request) => {
    const url = new URL(request.url);
    
    if (url.pathname === "/iot-data" && request.method === "POST") {
      return HandleIotData(request);
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      console.log('Client connected');
      clients.add(ws);
      ws.send('Hello from server');
    },
    message(ws, message) {
      console.log('Message from client: ' + message);
    },
    close(ws) {
      console.log('Client disconnected');
      clients.delete(ws);
    },
  },
});


async function HandleIotData(request: Request) {
  if (request.method === "POST") {
    try {
      const data = await request.json();
      console.log('Received IoT data:', data);

      clients.forEach(client => client.send(JSON.stringify(data)));

      return new Response("Data received", { status: 200 });
    } catch (error) {
      console.error('Error handling IoT data:', error);
      return new Response("Error handling data", { status: 500 });
    }
  } else {
    return new Response("Method Not Allowed", { status: 405 });
  }
}
