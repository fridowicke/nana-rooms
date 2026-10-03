// Keep the original single-response format usable while allowing Nana's combinations
// of a message, a sound and animated stickers on the same object.
export function reactionImages(reaction) {
  const images = reaction?.type === 'image' && reaction.value ? [reaction.value] : []
  return [...new Set([...images, ...(reaction?.images ?? []), ...(reaction?.gifs ?? [])])]
}

export function reactionAudio(reaction) {
  return reaction?.audio || (reaction?.type === 'audio' ? reaction.value : null)
}

export function hasReactionWindow(reaction) {
  return Boolean(reaction && !reaction.openInNewTab && ['text', 'image', 'video', 'link'].includes(reaction.type) && reaction.value)
}
