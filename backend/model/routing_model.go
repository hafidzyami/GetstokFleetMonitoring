package model

// RoutingRequest adalah model untuk request routing API
type RoutingRequest struct {
	Coordinates        [][]float64               `json:"coordinates"`
	ExtraInfo          []string                  `json:"extra_info,omitempty"`
	GeometrySimplify   string                    `json:"geometry_simplify,omitempty"`
	Elevation          bool                      `json:"elevation,omitempty"`
	InstructionsFormat string                    `json:"instructions_format,omitempty"`
	Language           string                    `json:"language,omitempty"`
	Options            map[string]interface{}    `json:"options,omitempty"`
}