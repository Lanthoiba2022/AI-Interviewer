import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface InterviewDB extends DBSchema {
  candidates: {
    key: string;
    value: {
      id: string;
      name: string;
      email: string;
      phone: string;
      resumeFileName: string;
      resumeScore: number;
      resumeStrengths: string[];
      resumeWeaknesses: string[];
      resumeText: string;
      questions: Array<{
        id: string;
        text: string;
        difficulty: string;
        timeLimit: number;
        answer?: string;
        score?: number;
        timeSpent?: number;
      }>;
      finalScore: number;
      finalSummary: string;
      completedAt: number;
      chatHistory: Array<{
        id: string;
        type: 'user' | 'ai' | 'system';
        content: string;
        timestamp: number;
      }>;
    };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      candidateId: string;
      stage: string;
      isActive: boolean;
      createdAt: number;
      lastUpdated: number;
    };
  };
}

class IndexedDBService {
  private db: IDBPDatabase<InterviewDB> | null = null;
  private dbName = 'InterviewDB';
  private version = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<InterviewDB>(this.dbName, this.version, {
      upgrade(db) {
        // Create candidates store
        if (!db.objectStoreNames.contains('candidates')) {
          const candidateStore = db.createObjectStore('candidates', { keyPath: 'id' });
          candidateStore.createIndex('completedAt', 'completedAt');
          candidateStore.createIndex('finalScore', 'finalScore');
          candidateStore.createIndex('name', 'name');
        }

        // Create sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('isActive', 'isActive');
          sessionStore.createIndex('lastUpdated', 'lastUpdated');
        }
      },
    });
  }

  // Candidate operations
  async saveCandidate(candidate: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('candidates', {
      ...candidate,
      id: candidate.id || `candidate_${Date.now()}`,
    });
  }

  async getCandidates(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAll('candidates');
  }

  async getCandidate(id: string): Promise<any | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.get('candidates', id);
  }

  async deleteCandidate(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('candidates', id);
  }

  async searchCandidates(searchTerm: string): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const candidates = await this.db.getAll('candidates');
    return candidates.filter(candidate => 
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async getCandidatesSorted(sortBy: string, sortOrder: 'asc' | 'desc'): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const candidates = await this.db.getAll('candidates');
    
    return candidates.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'completedAt' || sortBy === 'finalScore') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  // Session operations
  async saveSession(session: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.put('sessions', {
      ...session,
      id: session.id || `session_${Date.now()}`,
      lastUpdated: Date.now(),
    });
  }

  async getActiveSession(): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.getAllFromIndex('sessions', 'isActive', true);
    return sessions.length > 0 ? sessions[0] : null;
  }

  async endSession(sessionId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const session = await this.db.get('sessions', sessionId);
    if (session) {
      await this.db.put('sessions', {
        ...session,
        isActive: false,
        lastUpdated: Date.now(),
      });
    }
  }

  async getAllSessions(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAll('sessions');
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.clear('candidates');
    await this.db.clear('sessions');
  }

  async getStorageStats(): Promise<{ candidates: number; sessions: number; totalSize: number }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const candidates = await this.db.count('candidates');
    const sessions = await this.db.count('sessions');
    
    // Estimate storage size (rough calculation)
    const allCandidates = await this.db.getAll('candidates');
    const allSessions = await this.db.getAll('sessions');
    const totalSize = JSON.stringify([allCandidates, allSessions]).length;

    return { candidates, sessions, totalSize };
  }
}

export const indexedDBService = new IndexedDBService();
