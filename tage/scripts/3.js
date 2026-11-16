export function setupDay({ day, chatLog, saveChat, appendBubble, answerMatches, solutions, complete, celebrate }) {
  const pointsForTravelQuiz = () => Math.max(10 - (Number(wrongAttempts[day]) || 0), 0);

  const travelQuestions = [
    {
      correct: "Genau, der Eurostar! 🚄",
      next: "Und welches Meer unterfahre ich mit dem noch gleich? 🌊",
    },
    {
      correct: "Jaaa, der Ärmelkanal. Stimmt... habs vergessen 🚇🌊",
      next: "Und von wo aus könnte ich stattdessen mit dem Schiff fahren? Vllt will ich doch keinen Zug... ⛴️",
    },
    {
      correct: "Dover, natürlich! Frankreich, ich komme!!! 🎅✨",
      next: "",
    },
  ];

  const handleTravelQuizAnswer = (text) => {
    if (chatLog.quizDone) {
      complete(pointsForTravelQuiz());
      return true;
    }
    chatLog.quizIndex = Number(chatLog.quizIndex) || 0;
    const step = travelQuestions[chatLog.quizIndex];
    if (!step) return false;

    if (!solutions[chatLog.quizIndex]?.length) {
      appendBubble("Meine Lösungsliste fehlt gerade. Lade die Seite bitte neu. 🎅", "santa");
      return true;
    }

    if (answerMatches(text, solutions[chatLog.quizIndex])) {
      chatLog.quizIndex += 1;
      if (step.next) {
        saveChat();
        setTimeout(() => {
          appendBubble(step.correct, "santa");
          setTimeout(() => appendBubble(step.next, "santa"), 850);
        }, 720);
      } else {
        chatLog.quizDone = true;
        saveChat();
        appendBubble(step.correct, "santa");
        celebrate();
        complete(pointsForTravelQuiz());
      }
      return true;
    }

    // Unrelated chat messages get a friendly reply from the shared composer.
    if (!solutions.some(accepted => answerMatches(text, accepted))) return false;
    wrongAttempts[day] = (Number(wrongAttempts[day]) || 0) + 1;
    save();
    setTimeout(() => {
      appendBubble(`Nicht ganz. Versuch es nochmal. Sterne: ${pointsForTravelQuiz()} / 10 🎄`, "santa");
    }, 720);
    return true;
  };

  return { handleAnswer: handleTravelQuizAnswer };
}
