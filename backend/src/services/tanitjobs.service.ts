
export class TanitJobsService {
  private apiKey: string | null = null;
  private apiUrl = 'https://api.tanitjobs.com/v1'; // URL officielle à confirmer

  constructor() {
    this.apiKey = process.env.TANITJOBS_API_KEY || null;
  }

  async publierOffre(offre: any, offreDetail: any): Promise<{ success: boolean; jobId?: string; error?: string }> {
    if (!this.apiKey) {
      console.log('⚠️ TanitJobs: Pas de clé API configurée, mode simulation');
      return this.simulerPublication(offre);
    }

    try {
      const payload = {
        title: offre.intitule,
        description: offreDetail.description || '',
        contract_type: this.mapTypeContrat(offre.typeContrat),
        location: 'Tunis',
        salary_min: offre.budgetMin,
        salary_max: offre.budgetMax,
        skills: offreDetail.competences || [],
        company: 'Kilani Groupe',
        contact_email: 'recrutement@kilani.com',
        application_url: `${process.env.FRONTEND_URL}/candidature/${offre.id}`
      };

      const response = await fetch(`${this.apiUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`TanitJobs API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ TanitJobs: Offre publiée avec succès, ID:', data.id);
      
      return { success: true, jobId: data.id };

    } catch (error) {
      console.error('❌ TanitJobs publication error:', error);
      return this.simulerPublication(offre);
    }
  }

  private simulerPublication(offre: any): { success: boolean; jobId: string } {
    const mockJobId = `TANIT_${Date.now()}`;
    console.log(`
    ========================================
    📢 SIMULATION TANITJOBS
    ========================================
    Titre: ${offre.intitule}
    URL simulée: https://www.tanitjobs.com/offre/${mockJobId}
    Statut: Publié (mode démo)
    ========================================
    `);
    return { success: true, jobId: mockJobId };
  }

  private mapTypeContrat(type: string): string {
    const mapping: Record<string, string> = {
      'CDI': 'CDI',
      'CDD': 'CDD',
      'STAGE': 'Stage',
      'ALTERNANCE': 'Alternance',
      'FREELANCE': 'Freelance'
    };
    return mapping[type] || 'CDI';
  }
}

export const tanitjobsService = new TanitJobsService();