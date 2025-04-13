// backend/websocket/websocket.go
package websocket

import (
    "log"
    "sync"

    ws "github.com/gofiber/contrib/websocket"
)

// Client represents a WebSocket client connection
type Client struct {
    Conn *ws.Conn
    Mu   sync.Mutex
}

// Hub maintains the set of active clients
type Hub struct {
    clients    map[*Client]bool
    register   chan *Client
    unregister chan *Client
    broadcast  chan []byte
    mu         sync.Mutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        broadcast:  make(chan []byte),
    }
}

// Run starts the Hub
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()
            log.Println("New client connected, total clients:", len(h.clients))
        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                client.Conn.Close()
            }
            h.mu.Unlock()
            log.Println("Client disconnected, total clients:", len(h.clients))
        case message := <-h.broadcast:
            h.mu.Lock()
            for client := range h.clients {
                client.Mu.Lock()
                if err := client.Conn.WriteMessage(ws.TextMessage, message); err != nil {
                    log.Println("Error writing to client:", err)
                    client.Conn.Close()
                    delete(h.clients, client)
                }
                client.Mu.Unlock()
            }
            h.mu.Unlock()
        }
    }
}

// Register registers a new client
func (h *Hub) Register(client *Client) {
    h.register <- client
}

// Unregister removes a client
func (h *Hub) Unregister(client *Client) {
    h.unregister <- client
}

// Broadcast sends a message to all clients
func (h *Hub) Broadcast(message []byte) {
    h.broadcast <- message
}

// GetClientCount returns the number of connected clients
func (h *Hub) GetClientCount() int {
    h.mu.Lock()
    defer h.mu.Unlock()
    return len(h.clients)
}

// Global hub instance
var (
    WSHub    *Hub
    initOnce sync.Once
)

// InitHub initializes the global hub
func InitHub() {
    initOnce.Do(func() {
        WSHub = NewHub()
        go WSHub.Run()
    })
}

// GetHub returns the global hub instance
func GetHub() *Hub {
    return WSHub
}

// WebsocketHandler handles WebSocket connections
func WebsocketHandler(c *ws.Conn) {
    // Register client
    client := &Client{Conn: c}
    GetHub().Register(client)
    
    // Handle disconnect
    defer func() {
        GetHub().Unregister(client)
    }()
    
    // Keep connection alive and handle incoming messages if needed
    var (
        mt  int
        msg []byte
        err error
    )
    
    for {
        if mt, msg, err = c.ReadMessage(); err != nil {
            log.Println("Read error:", err)
            break
        }
        
        // Handle client messages if needed
        log.Printf("Received message from client: %s", msg)
        
        // Just to keep the connection alive
        if err = c.WriteMessage(mt, msg); err != nil {
            log.Println("Write error:", err)
            break
        }
    }
}