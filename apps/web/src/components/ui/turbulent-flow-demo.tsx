import { Component } from "@/components/ui/turbulent-flow";

const DemoOne = () => {
  return (
    <Component>
      <div style={{ 
        color: 'white', 
        textAlign: 'center',
        fontSize: '3rem',
        fontWeight: 'bold',
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
        fontFamily: 'Arial, sans-serif',
        letterSpacing: '2px'
      }}>
        <h1 style={{ margin: 0, marginBottom: '20px' }}>TURBULENT FLOW</h1>
        <p style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'normal',
          opacity: 0.9,
          maxWidth: '600px',
          lineHeight: '1.6'
        }}>
          Experience the organic beauty of computational fluid dynamics
        </p>
      </div>
    </Component>
  );
};

export { DemoOne };
export default DemoOne;
