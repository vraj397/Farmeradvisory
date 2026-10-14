import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { AiChatRepository } from './repositories/ai-chat.repository';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(private readonly chatRepo: AiChatRepository) {}

  async getConversations(farmerId: number) {
    return this.chatRepo.findConversations(farmerId);
  }

  async getMessages(conversationId: string, farmerId: number) {
    return this.chatRepo.getMessages(conversationId, farmerId);
  }

  async processMessage(
    farmerId: number,
    prompt: string,
    conversationId?: string,
    language: 'en' | 'gu' | 'hi' = 'en',
  ) {
    const convId = conversationId || `conv_${farmerId}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanPrompt = prompt.trim();

    // 1. Persist user message
    await this.chatRepo.createConversation(
      convId,
      farmerId,
      cleanPrompt.slice(0, 40) || 'Crop Advisory Query',
    );
    await this.chatRepo.addMessage(convId, farmerId, 'user', cleanPrompt);

    // 2. Generate agronomic expert response
    const answer = this.generateAgronomicAdvice(cleanPrompt, language);

    // 3. Persist assistant response
    await this.chatRepo.addMessage(convId, farmerId, 'assistant', answer.text, {
      category: answer.category,
      suggestedActions: answer.suggestedActions,
    });

    return {
      conversationId: convId,
      reply: answer.text,
      category: answer.category,
      suggestedActions: answer.suggestedActions,
      timestamp: new Date().toISOString(),
    };
  }

  private generateAgronomicAdvice(
    query: string,
    lang: 'en' | 'gu' | 'hi',
  ): { text: string; category: string; suggestedActions: string[] } {
    const q = query.toLowerCase();

    // Weather / Rain query
    if (q.includes('weather') || q.includes('rain') || q.includes('forecast') || q.includes('હવામાન') || q.includes('વરસાદ') || q.includes('मौसम')) {
      if (lang === 'gu') {
        return {
          text: 'હવામાન સલાહ: આગામી ૨૪ થી ૪૮ કલાક દરમિયાન હવામાનની આગાહી તપાસો. જો વરસાદની સંભાવના ૭૦% થી વધુ હોય તો સિંચાઈ કે દવા છંટકાવ મુલતવી રાખો.',
          category: 'weather',
          suggestedActions: ['સિંચાઈ બંધ રાખો', 'પાણી નિકાલની વ્યવસ્થા કરો', 'દવા છંટકાવ મોકૂફ રાખો'],
        };
      }
      return {
        text: 'Weather Advisory: Monitor upcoming 24-48 hour forecasts closely. If rain probability is over 60%, postpone overhead irrigation and foliar chemical spraying to avoid nutrient runoff.',
        category: 'weather',
        suggestedActions: ['Halt irrigation cycle', 'Ensure field drainage channels are clear', 'Postpone chemical spray'],
      };
    }

    // Pest / Disease / Worm / Insect
    if (q.includes('pest') || q.includes('disease') || q.includes('bollworm') || q.includes('blight') || q.includes('ઇયળ') || q.includes('રોગ') || q.includes('કીટક') || q.includes('कीट')) {
      if (lang === 'gu') {
        return {
          text: 'જીવાત નિયંત્રણ સલાહ: પાંદડાની નીચે અને છોડની ટોચ પર જીવાતોની હાજરી તપાસો. પ્રારંભિક તબક્કે ૧૦,૦૦૦ PPM લીમડાનું તેલ (Neem Oil) ૫ મિલી/લિટર પાણીમાં છાંટો. વધુ નુકસાન હોય તો અમારા રોગ સ્કેનરનો ઉપયોગ કરી ફોટો મોકલો.',
          category: 'pest_management',
          suggestedActions: ['ફોટો સ્કેન કરો', 'લીમડાના તેલનો છંટકાવ કરો', 'ફેરોમોન ટ્રેપ લગાવો'],
        };
      }
      return {
        text: 'Integrated Pest Management: Inspect underside of leaves and growing tips. For early infestation, apply Neem Oil (10,000 PPM) at 5 ml/liter water. For severe symptoms, upload a clear photo to the Disease Scanner for AI diagnosis.',
        category: 'pest_management',
        suggestedActions: ['Scan photo in Disease Scanner', 'Apply Neem oil 5ml/L', 'Install pheromone traps'],
      };
    }

    // Fertilizer / Nutrient / Urea / DAP
    if (q.includes('fertilizer') || q.includes('urea') || q.includes('dap') || q.includes('ખાતર') || q.includes('પોષક') || q.includes('उर्वरक')) {
      if (lang === 'gu') {
        return {
          text: 'ખાતર વ્યવસ્થાપન સલાહ: વાવણી વખતે ડી.એ.પી. અને પોટાશ પાયાના ખાતર તરીકે આપો. વાવેતરના ૩૦-૩૫ દિવસે જમીનમાં ભેજ હોય ત્યારે જ યુરિયા આપવું. વધુ પડતા યુરિયાથી છોડમાં રોગ-જીવાતનો ઉપદ્રવ વધે છે.',
          category: 'fertilizer',
          suggestedActions: ['જમીન ભેજવાળી હોય ત્યારે યુરિયા આપો', 'સંતુલિત NPK વાપરો', 'સૂક્ષ્મ તત્ત્વોનો છંટકાવ કરો'],
        };
      }
      return {
        text: 'Nutrient Management: Apply DAP and Potash as basal doses during sowing. Top-dress Urea in split doses only when sufficient soil moisture is present. Avoid excessive nitrogen to prevent vegetative lodging and aphid attraction.',
        category: 'fertilizer',
        suggestedActions: ['Top-dress Urea only on moist soil', 'Use split application', 'Apply balanced NPK'],
      };
    }

    // Irrigation / Water
    if (q.includes('water') || q.includes('irrigation') || q.includes('drip') || q.includes('પાણી') || q.includes('સિંચાઈ') || q.includes('सिंचाई')) {
      if (lang === 'gu') {
        return {
          text: 'સિંચાઈ સલાહ: સવારે અથવા સાંજે સિંચાઈ કરવી શ્રેષ્ઠ છે. ટપક સિંચાઈ (Drip) થી ૪૦-૫૦% પાણી બચે છે અને ઉત્પાદનમાં વધારો થાય છે. મૂળ પાસે પાણી ભરાવા ન દો.',
          category: 'irrigation',
          suggestedActions: ['ટપક સિંચાઈ વાપરો', 'સવારના સમયે પાણી આપો', 'જળ ભરાવ અટકાવો'],
        };
      }
      return {
        text: 'Irrigation Guidance: Early morning or late afternoon irrigation maximizes root absorption and minimizes evaporation loss. Drip irrigation reduces water usage by 40-50% while preventing fungal leaf dampening.',
        category: 'irrigation',
        suggestedActions: ['Irrigate during early morning', 'Inspect drip nozzles', 'Avoid waterlogging'],
      };
    }

    // General agronomic response
    if (lang === 'gu') {
      return {
        text: 'નમસ્તે ખેડૂત મિત્ર! તમારા પાકના સારા વિકાસ માટે યોગ્ય સમયે સિંચાઈ, ખાતર વ્યવસ્થાપન અને નિયમિત પાક નિરીક્ષણ કરો. જો કોઈ ખાસ સમસ્યા હોય તો રોગ સ્કેનરનો ઉપયોગ કરો અથવા કૃષિ અધિકારીનો સંપર્ક કરો.',
        category: 'general_advisory',
        suggestedActions: ['રોગ સ્કેનર વાપરો', 'હવામાન ચકાસો', 'કૃષિ સલાહ જુઓ'],
      };
    }
    return {
      text: 'Namaste Farmer! For optimal crop health, maintain balanced NPK nutrition, irrigate based on topsoil moisture, and scout your fields twice weekly. Use the Disease Scanner if you notice any unusual foliar spots or insect feeding.',
      category: 'general_advisory',
      suggestedActions: ['Use Disease Scanner', 'Check Weather Forecast', 'Consult Field Officer'],
    };
  }
}
