export class DeepLService {
  private apiKey = '5f7151da-1fac-42f2-a222-a926c3c583af:fx';
  private baseUrl = 'https://api-free.deepl.com/v2';

  async translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: [text],
          source_lang: sourceLanguage.toUpperCase(),
          target_lang: 'EN-US'
        })
      });

      if (!response.ok) {
        throw new Error(`Translation failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.translations[0].text;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }
} 