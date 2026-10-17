export const categories = [
  {
    id: "bible",
    name: "Bible Stories",
    short: "Bible",
    color: "#79b6df",
    pale: "#eaf4fb",
    icon: "book",
    description: "Big miracles. Unforgettable journeys.",
    detail:
      "From the garden of Eden to the journeys of the apostles, rediscover the stories that shaped our faith.",
  },
  {
    id: "history",
    name: "Coptic History",
    short: "History",
    color: "#f3be59",
    pale: "#fff4d8",
    icon: "church",
    description: "Ancient roots. Incredible stories.",
    detail:
      "Explore the roots of the Coptic Church in Egypt, its apostolic beginnings, and its enduring heritage.",
  },
  {
    id: "saints",
    name: "Saints & Heroes",
    short: "Saints",
    color: "#b4a0d9",
    pale: "#f1ebfa",
    icon: "sparkles",
    description: "Ordinary people. Extraordinary faith.",
    detail:
      "Meet the saints, desert fathers and mothers whose lives continue to inspire generations.",
  },
  {
    id: "traditions",
    name: "Church Traditions",
    short: "Traditions",
    color: "#7ebaa5",
    pale: "#eaf4ed",
    icon: "cross",
    description: "The beautiful things we pass down.",
    detail:
      "Discover the meaning behind the liturgy, worship, and traditions of the Coptic Orthodox Church.",
  },
  {
    id: "feasts",
    name: "Feasts & Fasts",
    short: "Feasts",
    color: "#ec8f7b",
    pale: "#fff0e9",
    icon: "sun",
    description: "A whole year of reasons to gather.",
    detail:
      "Journey through the church calendar, from the joy of the Resurrection to seasons of fasting and reflection.",
  },
  {
    id: "symbols",
    name: "Signs & Symbols",
    short: "Symbols",
    color: "#83c6ce",
    pale: "#eaf6f5",
    icon: "leaf",
    description: "Little details. Deeper meaning.",
    detail:
      "Look a little closer at the symbols, art, and visual language woven into our faith.",
  },
];
// A deliberately small, source-noted sample deck. Replace through the provider in engine.js.
export const questions = [
  {
    id: "bible-1",
    category: "bible",
    text: "Who built an ark before the great flood?",
    answers: ["Moses", "Noah", "Abraham", "David"],
    correct: 1,
    explanation:
      "Noah built the ark as God instructed, bringing his family and the animals to safety.",
    source: "Genesis 6–9",
  },
  {
    id: "bible-2",
    category: "bible",
    text: "At which town was Jesus born?",
    answers: ["Nazareth", "Jericho", "Bethlehem", "Capernaum"],
    correct: 2,
    explanation:
      "Jesus was born in Bethlehem of Judea during the reign of King Herod.",
    source: "Matthew 2:1",
  },
  {
    id: "history-1",
    category: "history",
    text: "Which evangelist is traditionally known as the founder of the Church in Alexandria?",
    answers: ["Saint Mark", "Saint Luke", "Saint John", "Saint Matthew"],
    correct: 0,
    explanation:
      "The Coptic Church traces its apostolic foundation in Alexandria to Saint Mark the Evangelist.",
    source:
      "Coptic Orthodox tradition: Saint Mark, founder of the See of Alexandria",
  },
  {
    id: "history-2",
    category: "history",
    text: "In which country did the Coptic Church first take root?",
    answers: ["Greece", "Italy", "Armenia", "Egypt"],
    correct: 3,
    explanation:
      "The Coptic Church has its roots in Egypt, with Alexandria as its historic apostolic see.",
    source: "History of the Coptic Orthodox Church of Alexandria",
  },
  {
    id: "saints-1",
    category: "saints",
    text: "Which Egyptian saint is often called the father of monasticism?",
    answers: [
      "Saint George",
      "Saint Anthony the Great",
      "Saint Stephen",
      "Saint Nicholas",
    ],
    correct: 1,
    explanation:
      "Saint Anthony the Great became a model for Christian monastic life in the Egyptian desert.",
    source: "Saint Athanasius, Life of Anthony",
  },
  {
    id: "saints-2",
    category: "saints",
    text: "Who is known as the first Christian martyr?",
    answers: ["Saint Paul", "Saint Peter", "Saint Stephen", "Saint Thomas"],
    correct: 2,
    explanation: "The book of Acts describes Stephen’s witness and martyrdom.",
    source: "Acts 6–7",
  },
  {
    id: "traditions-1",
    category: "traditions",
    text: "What language, alongside Arabic, is traditionally used in Coptic Orthodox worship?",
    answers: ["Coptic", "Latin", "Spanish", "Aramaic only"],
    correct: 0,
    explanation:
      "Coptic, the latest stage of the ancient Egyptian language, remains a liturgical language of the Church.",
    source: "Coptic Orthodox liturgical tradition",
  },
  {
    id: "traditions-2",
    category: "traditions",
    text: "What does the word “liturgy” refer to in church life?",
    answers: [
      "A type of building",
      "A musical instrument",
      "A season of the year",
      "The public worship of the Church",
    ],
    correct: 3,
    explanation:
      "Liturgy refers to the Church’s communal worship; the Divine Liturgy centers on the Eucharist.",
    source: "Christian liturgical terminology",
  },
  {
    id: "feasts-1",
    category: "feasts",
    text: "What does the Feast of the Resurrection celebrate?",
    answers: [
      "The birth of Jesus",
      "Jesus rising from the dead",
      "The baptism of Jesus",
      "The calling of the apostles",
    ],
    correct: 1,
    explanation:
      "The Feast of the Resurrection celebrates Jesus Christ’s victory over death.",
    source: "Matthew 28:1–10",
  },
  {
    id: "feasts-2",
    category: "feasts",
    text: "The Feast of Theophany commemorates which event?",
    answers: [
      "The Transfiguration",
      "The Ascension",
      "The baptism of Christ",
      "The feeding of the five thousand",
    ],
    correct: 2,
    explanation:
      "Theophany celebrates Christ’s baptism in the Jordan and the revelation of the Holy Trinity.",
    source: "Matthew 3:13–17; Coptic Orthodox feast calendar",
  },
  {
    id: "symbols-1",
    category: "symbols",
    text: "Which Gospel writer is traditionally represented by a lion?",
    answers: ["Saint Mark", "Saint Luke", "Saint John", "Saint Matthew"],
    correct: 0,
    explanation:
      "The four Gospel symbols are the human for Matthew, lion for Mark, ox for Luke, and eagle for John.",
    source: "Traditional Christian iconography of the four evangelists",
  },
  {
    id: "symbols-2",
    category: "symbols",
    text: "In the account of Jesus’ baptism, the Holy Spirit descends like which bird?",
    answers: ["An eagle", "A sparrow", "A raven", "A dove"],
    correct: 3,
    explanation:
      "The Gospel describes the Spirit of God descending like a dove and coming upon Jesus.",
    source: "Matthew 3:16",
  },
];
