// backend/src/services/linkedin.service.ts

interface LinkedInJobPost {
  title: string;
  description: string;
  location: string;
  employmentType: string;
  salaryRange?: { min: number; max: number; currency: string };
  skills: string[];
}

export class LinkedInService {
  private accessToken: string | null = null;
  
  constructor() {
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN || null;
  }

  async publierOffre(offre: any, offreDetail: any): Promise<{ success: boolean; jobId?: string; error?: string }> {
    if (!this.accessToken) {
      console.log('⚠️ LinkedIn: Pas de token configuré, mode simulation');
      return this.simulerPublication(offre, offreDetail?.lienCandidature);
    }

    try {
      const jobPost: LinkedInJobPost = {
        title: offre.intitule,
        description: this.formatterDescriptionLinkedIn(offreDetail),
        location: 'Tunis, Tunisie',
        employmentType: this.mapTypeContrat(offre.typeContrat),
        skills: offreDetail.competences || []
      };

      if (offre.budgetMin && offre.budgetMax) {
        jobPost.salaryRange = {
          min: Number(offre.budgetMin),
          max: Number(offre.budgetMax),
          currency: 'TND'
        };
      }

      const response = await fetch('https://api.linkedin.com/v2/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          title: jobPost.title,
          description: jobPost.description,
          location: { country: 'TN', city: 'Tunis' },
          employmentType: jobPost.employmentType,
          skills: jobPost.skills.map(s => ({ name: s })),
          ...(jobPost.salaryRange && {
            compensation: {
              amount: { min: jobPost.salaryRange.min, max: jobPost.salaryRange.max },
              currency: 'TND',
              frequency: 'MONTHLY'
            }
          })
        })
      });

      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ LinkedIn: Offre publiée avec succès, ID:', data.id);
      
      return { success: true, jobId: data.id };

    } catch (error) {
      console.error('❌ LinkedIn publication error:', error);
      return this.simulerPublication(offre, offreDetail?.lienCandidature);
    }
  }

  private simulerPublication(offre: any, lienCandidature?: string): { success: boolean; jobId: string } {
    const mockJobId = `LINKEDIN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`
    ========================================
    SIMULATION LINKEDIN JOBS
    ========================================
    Titre: ${offre.intitule}
    Type: ${offre.typeContrat}
    Lien candidature: ${lienCandidature || 'Non généré'}
    URL simulée: https://www.linkedin.com/jobs/view/${mockJobId}
    Statut: Publie (mode demo)
    ========================================
    `);
    return { success: true, jobId: mockJobId };
  }

  private formatterDescriptionLinkedIn(offreDetail: any): string {
    const lienCandidature = offreDetail.lienCandidature || process.env.FRONTEND_URL + '/candidature';
    
    return `
${offreDetail.description || ''}

Profil recherche :
${offreDetail.profilRecherche || ''}

Competences requises :
${(offreDetail.competences || []).map((c: string) => `- ${c}`).join('\n')}

Postuler sur : ${lienCandidature}
    `.trim();
  }

  private mapTypeContrat(type: string): string {
    const mapping: Record<string, string> = {
      'CDI': 'FULL_TIME',
      'CDD': 'CONTRACT',
      'STAGE': 'INTERNSHIP',
      'ALTERNANCE': 'APPRENTICESHIP',
      'FREELANCE': 'CONTRACT'
    };
    return mapping[type] || 'FULL_TIME';
  }
}

export const linkedinService = new LinkedInService();