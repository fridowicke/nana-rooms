/* =====================================================================
   WHAT SHE SAYS
   ---------------------------------------------------------------------
   Every line has an id and a text.
   - *stars* around a word make it neon mint in the bubble.
   - Voice: put a recording named <id>.mp3 into  narrator/voice/
     (e.g. narrator/voice/home-intro.mp3). If the file is there, her lips
     follow your voice. If not, she "talks" with the text only.
   - A list of several lines = one is picked at random.
   ===================================================================== */

export const LINES = {

  /* ---------- first page: the house ---------- */
  home: {
    first: [
      { id: "home-intro", text: "Oh, hi. Welcome to my house. Every door is a *different girl's bedroom*. Move over the house until your cursor turns into a key, then click a door." },
    ],
    again: [
      { id: "home-again-1", text: "Back already? Pick another door." },
      { id: "home-again-2", text: "The house missed you. Mostly me, though." },
    ],
    idle: [
      { id: "home-idle-1", text: "Psst. The *doors*. Click one." },
      { id: "home-idle-2", text: "Or click her name up top if you want to know who made all this." },
    ],
  },

  /* ---------- about / desktop ---------- */
  about: {
    first: [
      { id: "about-intro", text: "This is her desktop. Every *folder* opens something: press, writing, exhibitions, her CV. Double click like it's 2004." },
    ],
    again: [
      { id: "about-again", text: "Her desktop again. Try a folder you haven't opened yet." },
    ],
    idle: [
      { id: "about-idle-1", text: "There's a tiny music player down there. Put a song on, I'll dance. Kind of." },
      { id: "about-idle-2", text: "The little house in the corner takes you back home." },
    ],
  },

  /* ---------- folders on the desktop (opened as #folder-<id>) ---------- */
  folders: {
    "cv":                      [{ id: "folder-cv", text: "Her CV. Born in Odesa, lives in Tokyo, works *everywhere*." }],
    "press":                   [{ id: "folder-press", text: "Press. Vogue, Yokogao, Sabukaru. She's kind of a big deal, don't tell her I said that." }],
    "writing":                 [{ id: "folder-writing", text: "Her writing. Start with the one about *nipple patches*. Trust me." }],
    "filmmaking":              [{ id: "folder-curation", text: "Shows she curated. Film nights and fundraisers from Tokyo to Bucharest." }],
    "exhibitions":             [{ id: "folder-exhibitions", text: "Exhibitions. Marseille, Athens, Tokyo. I wasn't invited to any of them." }],
    "submit-room":             [{ id: "folder-submit", text: "Want *your* bedroom in my house? Submit it here." }],
    "diary":                   [{ id: "folder-diary", text: "Her diary. Photos only, so you don't have to read her handwriting." }],
    "open-collective-archive": [{ id: "folder-archive", text: "The 3D bedrooms wikipedia. Girls' rooms from all over the world. *Messy is the point.*" }],
    "research":                [{ id: "folder-research", text: "Research. Memes as folklore, cyberfeminism, the internet's matriarchy. Very serious. I'm a butt." }],
    "local-group":             [{ id: "folder-localgroup", text: "Local Group. The Ukrainian collective she started. They make prints, shows and noise." }],
    "she-is-so-hot":           [{ id: "folder-shesohot", text: "*She is so hot i wanna clean her room.* The work that started all of this. Including me." }],
  },

  /* ---------- rooms (#room-1, #room-2 …) ---------- */
  rooms: {
    general: {
      first: [
        { id: "room-howto", text: "Welcome to her room. Drag to look around. *Arrow keys or W A S D* to walk. The door bottom right takes you next door." },
      ],
      enter: [
        { id: "room-enter-1", text: "New room, new mess." },
        { id: "room-enter-2", text: "Wipe your feet." },
        { id: "room-enter-3", text: "Ooh. I've never been in here." },
      ],
      hunt: [
        { id: "hunt-intro", text: "See the list on the right? Find those things in the room and *click them*. Every one does something." },
      ],
      found: [
        { id: "found-1", text: "Found it!" },
        { id: "found-2", text: "Good eye." },
        { id: "found-3", text: "Mmm. More." },
      ],
      allFound: [
        { id: "hunt-done", text: "You found *everything*. Room's clean. Kind of. Next door?" },
      ],
      stuck: [
        { id: "hunt-stuck-1", text: "Stuck? Press *hint*. No shame." },
        { id: "hunt-stuck-2", text: "Look closer. Turn around. Squint." },
      ],
      hint: [
        { id: "hint-pressed", text: "Cheater. I respect it." },
      ],
      idle: [
        { id: "room-idle-1", text: "You can walk, you know. Arrow keys." },
        { id: "room-idle-2", text: "The *door* in the bottom right corner goes to the next room." },
      ],
    },

    /* per room: names of the girls + what she says when you enter */
    1:  { name: "YUNA",      enter: [{ id: "room-1",  text: "This is *Yuna's* room. Soft, sleepy, a lot of Rilakkuma." }] },
    2:  { name: "SUZUNE",    enter: [{ id: "room-2",  text: "*Suzune's* room. Anime on the walls, chaos on the floor. Perfect." }] },
    3:  { name: "AIKO",      enter: [{ id: "room-3",  text: "*Aiko's* room. She's hugging the husky, so be quiet." }] },
    4:  { name: "MOENE",     enter: [{ id: "room-4",  text: "*Moene's* room. She draws. Find it." }] },
    5:  { name: "PARDIS",    enter: [{ id: "room-5",  text: "*Pardis's* room." }] },
    6:  { name: "KAORI",     enter: [{ id: "room-6",  text: "*Kaori's* room." }] },
    7:  { name: "REI",       enter: [{ id: "room-7",  text: "*Rei's* room." }] },
    8:  { name: "YURIA",     enter: [{ id: "room-8",  text: "*Yuria's* room." }] },
    9:  { name: "MOMOCO",    enter: [{ id: "room-9",  text: "*Momoco's* room." }] },
    10: { name: "KUMO&MUKI", enter: [{ id: "room-10", text: "*Kumo and Muki's* room. Two of them, double the mess." }] },
    11: { name: "MIMI",      enter: [{ id: "room-11", text: "*Mimi's* room. Last door. You made it." }] },
  },

  /* ---------- the hidden objects (names exactly as in the room's list) ---------- */
  objects: {
    // room 2 · Suzune
    "tv":            [{ id: "obj-tv", text: "Strawberry cake on TV. Comfort food for the eyes." }],
    "gun":           [{ id: "obj-gun", text: "Bang. Relax, it's a toy. *Probably.*" }],
    "blue slippers": [{ id: "obj-slippers", text: "You can buy the same slippers. I checked." }],
    "clock":         [{ id: "obj-clock", text: "Tick tock. She's late for everything too." }],
    "wardrobe":      [{ id: "obj-wardrobe", text: "Inside the wardrobe: a whole *beauty salon* game. Go play." }],
    "curtains":      [{ id: "obj-curtains", text: "The young girl is her own spectacle. Heavy, I know." }],
    // room 3 · Aiko
    "drawers":       [{ id: "obj-drawers", text: "Hey! *Those are private.*" }],
    "nail polish":   [{ id: "obj-nails", text: "Hover it for sparkles, click it for a manicure game." }],
    "bag":           [{ id: "obj-bag", text: "Same bag is on Mercari. Don't tell her I told you." }],
    "pasta":         [{ id: "obj-pasta", text: "Carbonara. Of course it's carbonara." }],
    // room 4 · Moene
    "drawing":       [{ id: "obj-drawing", text: "She drew that. *Be nice.*" }],
  },

  /* ---------- tap on her inside a room (girls' bedrooms) ----------
     Only these lines. They come in a shuffled order and none repeats
     until all of them have been said, so every room gets its share. */
  roomPoke: [
    { id: "yg-01", text: "Ultimately, the Young-Girl's ideal is domestic." },
    { id: "yg-02", text: "The Young-Girl's ass is a global village." },
    { id: "yg-03", text: "BEAUTY ISN'T ABOUT HAVING A PRETTY FACE. IT'S ABOUT HAVING A PRETTY MIND, A PRETTY HEART, AND A PRETTY SOUL." },
    { id: "yg-04", text: "Good girls go to heaven, bad girls go everywhere..." },
    { id: "yg-05", text: "Don't be the got every guy had. Be the girl every guy wants, but cant have." },
    { id: "yg-06", text: "At twelve years old I decided to be beautiful!!!" },
    { id: "yg-07", text: "Act like a Ladey, think like a Boss." },
    { id: "yg-08", text: "The Young-Girl is so psychological. . . She has succeeded in rendering herself as flat as the object of psychology." },
    { id: "yg-09", text: "Love, Work, Health." },
    { id: "yg-10", text: "Once a good girl gone bad, she's gone #forever21." },
    { id: "yg-11", text: "I'm gonna do whatever I want with my hair!" },
    { id: "yg-12", text: "The Young-Girl doesn't age. She decomposes." },
    { id: "yg-13", text: "The Young-Girl is the Young-Girl's ideal." },
  ],

  /* ---------- tap on her ---------- */
  poke: [
    { id: "poke-1", text: "That tickles." },
    { id: "poke-2", text: "Eyes on the rooms, darling." },
    { id: "poke-3", text: "I'm a butt with lips. Don't overthink it." },
  ],
};

/* ---------- timing ---------- */
export const SETTINGS = {
  idleSeconds: 30,       // she nudges after this long without the visitor doing anything
  stuckSeconds: 45,      // in a room with a list: offers the hint button after this long without a find
  foundChance: 1,        // 1 = she reacts to every found object
  mouthSensitivity: 14,  // with your voice: higher = mouth opens wider on quiet speech
  startOpen: true,       // false = she starts minimised as a small button
};
