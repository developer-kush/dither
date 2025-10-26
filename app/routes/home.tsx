import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dither - Pixel Art Editor" },
    { name: "description", content: "Create and manage pixel art tilesets with Dither" },
  ];
}

export default function Home() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-8 p-8">
        <pre className="text-4xl font-mono leading-tight font-bold text-white">
{`
▓█████▄  ██▓  ▄▄█████▓ ██░ ██ ▓█████  ██▀███  
▒██▀ ██▌▓██▒ ▓ ███▒  ▒▓██░ ██▒▓█   ▀ ▓██ ▒ ██▒
░██   █▌▒██▒▒  ▓██░   ▒██▀▀██░▒███   ▓██ ░▄█ ▒
░▓█▄  █▌░██░░  ▓██▓   ░▓█ ░██ ▒▓█  ▄ ▒██▀▀█▄  
░▒████▓ ░██░   ▒██▒   ░▓█▒░██▓░▒████▒░██▓ ▒██▒
 ▒▒▓  ▒ ░▓     ▒ ░░    ▒ ░░▒░▒░░ ▒░ ░░ ▒▓ ░▒▓░
 ░ ▒  ▒  ▒ ░     ░     ▒ ░▒░ ░ ░ ░  ░  ░▒ ░ ▒░
 ░ ░  ░  ▒ ░   ░       ░  ░░ ░   ░     ░░   ░ 
   ░     ░             ░  ░  ░   ░  ░   ░     
 ░                                           
`}
        </pre>
        
        <div className="space-y-4">
          <p className="text-xl text-gray-300">Pixel Art Editor & Tileset Generator</p>
          <p className="text-base text-gray-400">Create beautiful pixel art with powerful tools</p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              to="/tile-editor"
              className="inline-block px-8 py-4 text-lg border-4 border-white font-bold transition-all hover:translate-x-1 hover:translate-y-1 bg-white text-black"
              style={{ 
                boxShadow: '6px 6px 0 #fff'
              }}
            >
              TILE EDITOR
            </Link>
            
            <Link 
              to="/tile-studio"
              className="inline-block px-8 py-4 text-lg border-4 border-white font-bold transition-all hover:translate-x-1 hover:translate-y-1 bg-white text-black"
              style={{ 
                boxShadow: '6px 6px 0 #fff'
              }}
            >
              TILE STUDIO
            </Link>
            
            <Link 
              to="/tiles"
              className="inline-block px-8 py-4 text-lg border-4 border-white font-bold transition-all hover:translate-x-1 hover:translate-y-1 bg-white text-black"
              style={{ 
                boxShadow: '6px 6px 0 #fff'
              }}
            >
              TILES MANAGER
            </Link>
            
            <Link 
              to="/map-editor"
              className="inline-block px-8 py-4 text-lg border-4 border-white font-bold transition-all hover:translate-x-1 hover:translate-y-1 bg-white text-black"
              style={{ 
                boxShadow: '6px 6px 0 #fff'
              }}
            >
              MAP EDITOR
            </Link>
          </div>
        </div>
        
        <div className="mt-12 text-sm text-gray-500">
          <p>Draw • Paint • Blend • Fill • Export</p>
        </div>
        
        <div className="mt-8 text-sm text-gray-400">
          <p>
            Made by{' '}
            <a 
              href="https://devkush.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white underline hover:text-gray-300 transition-colors"
            >
              Kushagra Agarwal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
