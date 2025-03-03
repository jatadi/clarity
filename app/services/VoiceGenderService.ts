import * as FileSystem from 'expo-file-system';

export class VoiceGenderService {
  private apiKey = '7033|2z3G44M9DmAALb7pb8xYfQWRmdi5f8p5LKQ2OaBy';
  private baseUrl = 'https://zylalabs.com/api/2298/voice+gender+recognition+api/2191/gender+by+file';

  async detectGender(audioUri: string): Promise<'male' | 'female' | null> {
    try {
      // Convert audio to base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Create form data with base64 content
      const formData = new FormData();
      formData.append('file', base64Audio);

      console.log('Sending request to gender detection API...');
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(`Gender detection failed with status ${response.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Gender detection response:', data);

      return data.gender?.toLowerCase() as 'male' | 'female' | null;
    } catch (error) {
      console.error('Gender detection error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return null;
    }
  }
} 