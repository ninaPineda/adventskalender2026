export function setupDay({ appendBubble }) {
  return { handleAnswer() {
    appendBubble('Komm in den Videoanruf – dort kannst du mir mit den Sprechblasen den Weg zeigen. Ich warte vor dem Klo! 🎅📹', 'santa');
    return true;
  } };
}
