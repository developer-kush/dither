// Export/Import system state utilities

export interface SystemState {
  version: string;
  exportDate: string;
  tiles: any[];
  mapData: Array<[string, string]>;
}

export function exportSystemState(tiles: any[], mapData: Array<[string, string]>): void {
  const state: SystemState = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    tiles,
    mapData,
  };

  const dataStr = JSON.stringify(state, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `dither-export-${Date.now()}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}

export function importSystemState(file: File): Promise<SystemState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const state = JSON.parse(content) as SystemState;
        
        // Validate the structure
        if (!state.version || !state.tiles || !state.mapData) {
          throw new Error('Invalid export file format');
        }
        
        resolve(state);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

