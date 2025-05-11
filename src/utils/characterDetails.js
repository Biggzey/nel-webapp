// Utility to extract character details from a character object or description string
export function extractCharacterDetails(character) {
  // Accepts either a character object or a description string
  const description = typeof character === 'string' ? character : character.description || '';
  const result = { ...character };

  // Common patterns for age
  const agePatterns = [
    /(\d+)\s*(?:years? old|yo|y\.o\.|age|aged)/i,
    /age:\s*(\d+)/i,
    /aged\s*(\d+)/i,
    /(\d+)\s*(?:years|yrs)/i
  ];
  for (const pattern of agePatterns) {
    const ageMatch = description.match(pattern);
    if (ageMatch && !result.age) {
      result.age = ageMatch[1];
      break;
    }
  }

  // Gender
  const genderMatch = description.match(/\b(male|female|non-binary|transgender|trans|genderfluid|agender|genderqueer|man|woman|boy|girl)\b/i);
  if (genderMatch && !result.gender) {
    result.gender = genderMatch[1];
  }

  // Race/species
  const raceMatch = description.match(/\b(human|elf|dwarf|orc|halfling|dragon|fairy|demon|angel|vampire|werewolf|alien|robot|android|cyborg|ghost|undead|monster|beast|animal|creature|species|race)\b/i);
  if (raceMatch && !result.race) {
    result.race = raceMatch[1];
  }

  // Occupation
  const occupationMatch = description.match(/\b(wizard|warrior|knight|mage|sorcerer|priest|cleric|paladin|ranger|rogue|thief|assassin|bard|druid|monk|barbarian|fighter|archer|hunter|scout|guard|soldier|merchant|noble|royalty|prince|princess|king|queen|emperor|empress|lord|lady|sir|madam|doctor|scientist|engineer|teacher|student|scholar|researcher|explorer|adventurer|traveler|wanderer|mercenary|bounty hunter|pirate|sailor|captain|commander|general|officer|guard|soldier|merchant|trader|shopkeeper|innkeeper|bartender|chef|cook|farmer|miner|blacksmith|carpenter|tailor|weaver|jeweler|alchemist|apothecary|healer|midwife|nurse|doctor|surgeon|priest|monk|nun|cleric|paladin|druid|shaman|witch|warlock|necromancer|summoner|conjurer|illusionist|enchanter|transmuter|diviner|abjurer|evoker|conjurer|necromancer|illusionist|enchanter|transmuter|diviner|abjurer|evoker)\b/i);
  if (occupationMatch && !result.occupation) {
    result.occupation = occupationMatch[1];
  }

  // Likes
  const likesMatch = description.match(/(?:likes?|enjoys?|loves?|fond of|interested in)[:]\s*([^.]+)/i);
  if (likesMatch && !result.likes) {
    result.likes = likesMatch[1].trim();
  }

  // Dislikes
  const dislikesMatch = description.match(/(?:dislikes?|hates?|avoids?|not fond of)[:]\s*([^.]+)/i);
  if (dislikesMatch && !result.dislikes) {
    result.dislikes = dislikesMatch[1].trim();
  }

  // First message
  const firstMessageMatch = description.match(/(?:first message|greeting|initial message)[:]\s*([^.]+)/i);
  if (firstMessageMatch && !result.firstMessage) {
    result.firstMessage = firstMessageMatch[1].trim();
  }

  return result;
} 