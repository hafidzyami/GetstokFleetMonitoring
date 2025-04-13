// Update your websocket/websocket.go file to include these improvements

package websocket

import (
    "log"
    "sync"
    "time"

    ws "github.com/gofiber/contrib/websocket"
)

// Client represents a WebSocket client connection
type Client struct {
    Conn      *ws.Conn
    Mu        sync.Mutex
    Send      chan []byte   // Channel for outbound messages
    LastPing  time.Time     // Track last ping time
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
        broadcast:  make(chan []byte, 256), // Buffered channel
    }
}

// Run starts the Hub
func (h *Hub) Run() {
    log.Println("Starting WebSocket hub")
    
    // Start a ticker to check for stale connections
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            client.LastPing = time.Now() // Set initial ping time
            h.clients[client] = true
            h.mu.Unlock()
            log.Println("New client connected, total clients:", len(h.clients))
            
        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.Send)
            }
            h.mu.Unlock()
            log.Println("Client disconnected, total clients:", len(h.clients))
            
        case message := <-h.broadcast:
            h.mu.Lock()
            for client := range h.clients {
                select {
                case client.Send <- message:
                    // Message sent to client's send channel
                default:
                    // Client's send buffer is full, assume it's dead
                    close(client.Send)
                    delete(h.clients, client)
                }
            }
            h.mu.Unlock()
            
        case <-ticker.C:
            // Check for stale connections
            now := time.Now()
            h.mu.Lock()
            for client := range h.clients {
                if now.Sub(client.LastPing) > 2*time.Minute {
                    log.Println("Closing stale connection (no ping for 2 minutes)")
                    client.Conn.Close()
                    delete(h.clients, client)
                    close(client.Send)
                }
            }
            h.mu.Unlock()
        }
    }
}

// Register registers a new client
func (h *Hub) Register(client *Client) {
    // Initialize the send channel if not already done
    if client.Send == nil {
        client.Send = make(chan []byte, 256)
    }
    h.register <- client
    
    // Start a goroutine to pump messages from the hub to the client
    go func() {
        for message := range client.Send {
            client.Mu.Lock()
            err := client.Conn.WriteMessage(ws.TextMessage, message)
            client.Mu.Unlock()
            
            if err != nil {
                log.Printf("Error writing to client: %v", err)
                break
            }
        }
    }()
}

// Unregister removes a client
func (h *Hub) Unregister(client *Client) {
    h.unregister <- client
}

// Broadcast sends a message to all clients
func (h *Hub) Broadcast(message []byte) {
    h.broadcast <- message
}

// UpdateClientPing updates the last ping time for a client
func (h *Hub) UpdateClientPing(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    if _, ok := h.clients[client]; ok {
        client.LastPing = time.Now()
    }
}

// BroadcastToClient sends a message to a specific client
func (h *Hub) BroadcastToClient(client *Client, message []byte) bool {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    if _, ok := h.clients[client]; !ok {
        return false
    }
    
    select {
    case client.Send <- message:
        return true
    default:
        close(client.Send)
        delete(h.clients, client)
        return false
    }
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