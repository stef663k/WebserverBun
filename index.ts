import { serve, type ServerWebSocket } from "bun";
import jwt from "jsonwebtoken";

// Map to store WebSocket connections with their associated metadata
let clients: Set<ServerWebSocket<unknown>> = new Set();

const server = serve({
  fetch: async (request) => {
    const url = new URL(request.url);
    
    if (url.pathname === "/iot-data" && request.method === "POST") {
      return HandleIotData(request);
    }

    return new Response("Not Found", { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  },
  websocket: {
    open(ws) {

      ws.send('Hello from server');
    },
    message(ws, message: any) {
      // Log incoming messages
      console.log('Message received:', message);
    },
    close(ws) {
      // Remove the WebSocket connection from the clients Map
      console.log('Client disconnected');
    },
  },
  port: 80 // Specify the port for WebSocket server
});

async function HandleIotData(request: Request) {
  if (request.method === "POST") {
    try {
      const data = await request.json();
      console.log('Received IoT data:', data);

      // Broadcast IoT data to all connected clients
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

