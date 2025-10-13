// netlify/functions/scheduled-cleanTokens.mjs
export const handler = async () => {
  const SIXTY_DAYS = 1000 * 60 * 60 * 24 * 60;
  
  const users = await admin.firestore().collection('USUARIOS').get();
  
  for (const userDoc of users.docs) {
    const tokens = userDoc.data().fcmTokens || [];
    const validTokens = tokens.filter(t => {
      const age = Date.now() - t.timestamp.toMillis();
      return age < SIXTY_DAYS;
    });
    
    if (validTokens.length !== tokens.length) {
      await userDoc.ref.update({ fcmTokens: validTokens });
    }
  }
  
  return { statusCode: 200 };
};
