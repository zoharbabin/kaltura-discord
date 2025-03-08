import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Create a custom environment variables handler
export const envVars: Record<string, string> = {};

// Check if .env file exists
const envPath = path.resolve(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

// Load environment variables from .env file if it exists
if (envExists) {
  try {
    // Read and parse the .env file directly
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    // Parse each line and store in our envVars object
    envLines.forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }
      
      // Parse key=value pairs
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove surrounding quotes if they exist
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    });
    
    console.log('Loading environment variables from .env file with priority');
  } catch (error) {
    console.error('Error reading .env file:', error);
  }
}

// Also load with dotenv for backward compatibility with other modules
dotenv.config();

// Helper function to get environment variables with .env priority
export function getEnv(key: string, defaultValue: string = ''): string {
  // First check our parsed .env values
  if (envVars[key] !== undefined) {
    return envVars[key];
  }
  
  // Fall back to process.env only if not found in .env
  return process.env[key] || defaultValue;
}

console.log(envExists ?
  'Environment variables loaded from .env file with priority' :
  'No .env file found, using system environment variables');