export function setupDay({ character, chatLog, saveChat, appendBubble, appendImage, readQuest, saveQuest, answerMatches, solutions, completeNow, celebrate }) {
  // Both contacts share the quest, but keep separate conversations and photo history.
  const quest = readQuest();
  if (character === 'santa' && quest.together && !chatLog.reunionShown) {
    appendBubble('Hey, ich habe gerade den Nikolaus getroffen! Er nimmt mich ein Stück mit nach Norden. Super Sache – ich komme meinem Ziel immer näher. Danke dir! 🎅🚗✨', 'santa');
    chatLog.reunionShown = true;
    saveChat();
    saveQuest({...readQuest(), confirmationRead:true});
  }

  return { handleAnswer(text) {
    const state = readQuest();
    if (state.together) return false;
    if (character === 'santa') {
      if (answerMatches(text, solutions[0]) && state.photoSent) {
        appendBubble('Wenn du meinen Standort herausgefunden hast, sag am besten dem Nikolaus Bescheid. Ich warte hier so lange auf ihn! 🎅', 'santa');
        return true;
      }
      if (!/\bwo\b|standort|aufenthaltsort|gelandet|angekommen|foto|bild|aussicht/i.test(text)) return false;
      if (state.photoSent) {
        appendBubble('Mehr als das Foto von gestern Abend habe ich leider auch nicht. Schau es dir noch einmal in Ruhe an. Vielleicht erkennst du die Aussicht? 🎅', 'santa');
        return true;
      }
      appendBubble('Irgendwie weiß ich nicht so richtig, wo ich hier gerade angekommen bin. Der Pflaume von gestern hat mich einfach irgendwo abgesetzt. 🙃', 'santa');
      appendBubble('Wir waren gestern Abend hier auf dem Weihnachtsmarkt, und da habe ich dieses Bild gemacht. Das war meine Aussicht. Hast du eine Idee, wo das sein könnte? 📸', 'santa');
      appendImage('../assets/day-6/weihnachtsmarkt.jpg', 'Abendfoto eines Weihnachtsmarkts mit vielen Lichterketten, einem Weihnachtsbaum und hohen Gebäuden im Hintergrund.');
      saveQuest({...state, photoSent:true});
      return true;
    }
    if (character === 'nikolaus' && answerMatches(text, solutions[0])) {
      saveQuest({...state, together:true, confirmationRead:false});
      appendBubble('Ah super, danke dir! Ich nehme den Weihnachtsmann jetzt mit. 🎁🚗', 'santa');
      // Commit immediately: switching chats must not cancel completion or the reward.
      completeNow();
      celebrate();
      return true;
    }
    return false;
  } };
}
