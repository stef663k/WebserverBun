import { serve, type ServerWebSocket } from "bun";
import jwt from "jsonwebtoken";

let client: Set<ServerWebSocket<unknown>> = new Set();

async function fetchData() {
  let token: string, expirationTime, card, checkin, user: any, role;
  try {
    let authApi = await fetch('https://skoauthapi.azurewebsites.net/api/Auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'Test1234, ',
      }),
    });

    console.log("** Auth API Request Sent **");

    let authResponse = await authApi;
    console.log("** Auth API Response Received **");

    const authData = await authResponse.json();
    token = authData.token;
    expirationTime = authData.expirationTime;
      
    console.log("** Auth API Response Status: ", authResponse.status);
    console.log("** Auth API Response Headers: ", authResponse.headers);
    console.log("** Token to be used: ", token);

    const decodedToken = jwt.decode(token);
    console.log("** Decoded Token: ", decodedToken);

    let userApi = await fetch('https://skoauthapi.azurewebsites.net/api/User/GetUserOwnData', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log("** User API Request Sent **");

    let userResponse = await userApi;
    console.log("** User API Response Status: ", userResponse.status);
    console.log("** User API Response Headers: ", userResponse.headers);
    console.log("** User API Response Received **");

    user = await userResponse.json();


    console.log("** User API Response Data: ", user);

    // let roleApi = await fetch('https://skoauthapi.azurewebsites.net/api/User/GetUserDataByRole', {
    //   method: 'GET',
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json',
    //     'roleName': 'admin',
    //   },
    // });
    // let roleResponse = await roleApi;
    // console.log("** Role API Response Status: ", roleResponse.status);
    // console.log("** Role API Response Headers: ", roleResponse.headers);
    // console.log("** Role API Response Received **");
    // if (roleResponse.headers.get('Content-Type') === 'application/json') { 
    //   let roleData = await roleResponse.json();
    //   console.log("** Role API Response Data: ", roleData);
    // } else {
    //   let roleTextData = await roleResponse.text();
    //   console.log("** Role API Response Data: ", roleTextData);
    // }
    let cardApi = await fetch('https://skocheckinapi.azurewebsites.net/api/cards', {
      verbose: true, rejectUnauthorized: false,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    let cardResponse = await cardApi;
    console.log("Card API response status: ", cardResponse.status);
    console.log("Card API response headers: ", cardResponse.headers);

    if (cardResponse.headers.get('Content-Type') === 'application/json') {
      card = await cardResponse.json();
    } else {
      card = await cardResponse.text();
    }

    console.log("Card API response data: ", card);

    // let checkinApi = await fetch('https://skocheckinapi.azurewebsites.net/checking/{id}', {verbose: true, rejectUnauthorized: false});
    // let checkinResponse = await checkinApi;
    // console.log("Checkin API response status: ", checkinResponse.status);
    // console.log("Checkin API response headers: ", checkinResponse.headers);

    // if (checkinResponse.headers.get('Content-Type') === 'application/json') {
    //   checkin = await checkinResponse.json();
    // } else {
    //   checkin = await checkinResponse.text();
    // }

    // console.log("Checkin API response data: ", checkin);

    const ws = new WebSocket('https://skocheckinapi.azurewebsites.net/');
    ws.onopen = () => {
      ws.send(JSON.stringify({ token }));
      ws.send(JSON.stringify({ user }));
      console.log('Connected to server');
      console.log('Sent token to server');
      console.log('token: ', token);
    };
    ws.onmessage = (event) => {
      console.log('Message from server: ', event.data);
    };

    console.log(ws);
    return { token, expirationTime, card, checkin, user, role};
  } catch (error) {
    console.error("** Error fetching data: ", error);
    return { token: "", expirationTime: null, card: null, checkin: null, user: null, role: null};
  }
}
const server = serve({
  port: 42069,
  fetch(request, server) {
    const url = new URL(request.url);
    
    if (url.pathname === "/iot-data" && request.method === "POST") {
      return HandleIotData(request);
    }

    if (server.upgrade(request)) {
      return;
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      console.log('Client connected');
      client.add(ws);
      ws.send('Hello from server');
    },
    message(ws, message) {
      console.log('Client sent: ' + message);
      client.forEach(c => c.send(message));
    },
    close(ws) {
      console.log('Client disconnected');
      client.delete(ws);
    },
  },
});
async function HandleIotData(request: any) {
  try {
    const data = await request.json();
    console.log('Received IoT data: ', data);

    client.forEach(c => c.send(JSON.stringify(data)));
    return new Response("Data received", { status: 200 });
  } catch (error) { 
    console.error('Error handling IoT data: ', error);
    return new Response("Error handling data", { status: 500 });
  
  }
} 
fetchData().then(({ token, expirationTime, card, checkin, user, role }) => {
  const server = Bun.serve({
    port: 3117,
    async fetch(request, server) {
      if (server.upgrade(request)) {
        return;
      }
      const data = await fetchData();
      const tokenDecode = jwt.decode(data.token);
      // return new Response(JSON.stringify(data.user) { headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(data, tokenDecode), { headers: { 'Content-Type': 'application/json' } });
    },
    websocket: {
      async open(ws) {
        console.log('Client connected');
        client.add(ws);
        ws.send('Hello from server');
        const data = await fetchData();
        console.log('Received token:', data.token);
        console.log('User data: ', data.user);
      },
      message(ws, message) {
        console.log('Client sent: ' + message);
        client.forEach(c => c.send(message));
      },
      close(ws) {
        console.log('Client disconnected');
        client.delete(ws);
      },
    },
  });
});
