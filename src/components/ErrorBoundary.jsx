import React from "react";

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error, errorInfo) { 
    console.error("Game crashed:", error, errorInfo); 
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: "center", marginTop: "50px", color: "white", padding: "20px", background: "rgba(0,0,0,0.8)", borderRadius: "10px", display: "inline-block" }}>
          <h1 style={{ color: "#e74c3c" }}>⚠️ حدث خطأ في اللعبة</h1>
          <p style={{ color: "#bdc3c7", marginBottom: "20px" }}>{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: "10px 20px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
          >
            🔄 إعادة تحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}