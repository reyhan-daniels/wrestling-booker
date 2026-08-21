/**
 * Loads the starting roster: AEW, NJPW and Stardom, plus each promotion's
 * championships and weekly series.
 *
 *   npm run seed:real                      # into the first world
 *   npm run seed:real -- <worldId>         # into a specific world
 *
 * Safe to re-run: everything is matched by name and created only if missing,
 * so it never duplicates and never touches shows or results.
 *
 * Roster membership comes from the user's own table, not from real life —
 * several of these people work elsewhere in reality, and the table wins.
 *
 * Billed height and weight are the English Wikipedia infobox for each wrestler,
 * converted to feet/inches and pounds, falling back to the Pro Wrestling Wiki
 * where Wikipedia carried no figure. The seven entries marked `// estimated`
 * are not billed anywhere: Tokyo Joshi prints "-" in the weight row for its
 * whole roster, and WWE no longer bills weights for the women's division.
 * Those are guesses from build and camera, and are the first thing to correct
 * if you know better. Alignment is a judgement call about how each person is
 * being presented, and is the field most likely to be stale.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Alignment, Gender } from "../src/generated/prisma/enums";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type Person = {
  name: string;
  nickname?: string;
  height?: string;
  weight?: string;
  align: Alignment;
  /** Recorded per person, never inferred from which promotion they work. */
  gender: Gender;
  /** Primary promotion first; a second entry is a genuine dual commitment. */
  companies: string[];
};

// Wrestlers are keyed to a promotion by abbreviation, because that is the part
// that stays put — the full name is the user's to spell however they like.
const AEW = "AEW";
const NJPW = "NJPW";
const STARDOM = "STARDOM";

const ROSTER: Person[] = [
  // --- AEW -------------------------------------------------------------------
  { name: "Kenny Omega", nickname: "The Best Bout Machine", height: "6'0\"", weight: "229 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Jon Moxley", nickname: "The Purveyor of Violence", height: "6'4\"", weight: "231 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Bron Breakker", height: "6'0\"", weight: "223 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Carmelo Hayes", nickname: "Him", height: "5'10\"", weight: "210 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Ilja Dragunov", nickname: "The Mad Dragon", height: "5'10\"", weight: "210 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Kevin Owens", nickname: "The Prizefighter", height: "6'0\"", weight: "242 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Sami Zayn", nickname: "The Underdog from the Underground", height: "6'1\"", weight: "212 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Ace Austin", nickname: "The Sensation", height: "5'10\"", weight: "210 lbs", align: "TWEENER",
    gender: "MALE", companies: [AEW] },
  { name: "Adam Copeland", nickname: "The Rated-R Superstar", height: "6'5\"", weight: "241 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Adam Page", nickname: "Hangman", height: "6'1\"", weight: "229 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Alex Shelley", height: "5'10\"", weight: "215 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Andrade El Idolo", nickname: "El Ídolo", height: "5'9\"", weight: "230 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Anthony Bowens", nickname: "Five Tool Player", height: "5'10\"", weight: "205 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "AR Fox", height: "6'0\"", weight: "200 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Austin Gunn", height: "5'11\"", weight: "215 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Bandido", height: "5'7\"", weight: "211 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Beast Mortos", height: "5'10\"", weight: "249 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Bishop Kaun", height: "6'0\"", weight: "237 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Bobby Lashley", nickname: "The All Mighty", height: "6'3\"", weight: "273 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Brian Cage", nickname: "The Machine", height: "6'0\"", weight: "268 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Brody King", height: "6'6\"", weight: "290 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Cash Wheeler", height: "5'10\"", weight: "223 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Chris Jericho", nickname: "The Ocho", height: "6'0\"", weight: "227 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Chris Sabin", height: "5'10\"", weight: "205 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Christian Cage", nickname: "The Patriarch", height: "6'1\"", weight: "218 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Claudio Castagnoli", nickname: "The Swiss Cyborg", height: "6'5\"", weight: "232 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Colten Gunn", height: "6'1\"", weight: "222 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] }, // estimated
  { name: "Dalton Castle", nickname: "The Peacock", height: "5'11\"", weight: "217 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Daniel Garcia", nickname: "Red Death", height: "6'0\"", weight: "187 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Dante Martin", height: "5'11\"", weight: "187 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Darby Allin", height: "5'8\"", weight: "180 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Dax Harwood", height: "5'10\"", weight: "223 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Dezmond Xavier", height: "5'9\"", weight: "178 lbs", align: "TWEENER",
    gender: "MALE", companies: [AEW] },
  { name: "Eddie Kingston", nickname: "The Mad King", height: "6'1\"", weight: "240 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "El Clon", height: "5'9\"", weight: "152 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Hechicero", nickname: "El Mago", height: "5'10\"", weight: "229 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Jack Perry", nickname: "Scapegoat", height: "5'10\"", weight: "167 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Jake Doyle", height: "6'2\"", weight: "262 lbs", align: "TWEENER",
    gender: "MALE", companies: [AEW] },
  { name: "Katsuyori Shibata", nickname: "The Wrestler", height: "6'0\"", weight: "209 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Konosuke Takeshita", nickname: "The Alpha", height: "6'2\"", weight: "251 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Kyle Fletcher", nickname: "The Protostar", height: "6'3\"", weight: "240 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Lee Moriarty", height: "5'11\"", weight: "185 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Lio Rush", nickname: "The Man of the Hour", height: "5'6\"", weight: "160 lbs", align: "TWEENER",
    gender: "MALE", companies: [AEW] },
  { name: "Mansoor", height: "6'0\"", weight: "216 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Mark Briscoe", height: "6'0\"", weight: "229 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Mark Davis", height: "6'4\"", weight: "240 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Máscara Dorada", height: "5'7\"", weight: "165 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Mason Madden", height: "6'8\"", weight: "286 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Matt Sydal", height: "5'8\"", weight: "183 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Matt Jackson", height: "5'10\"", weight: "208 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "MJF", nickname: "Better Than You Bay Bay", height: "5'11\"", weight: "226 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Nick Jackson", height: "5'10\"", weight: "209 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Max Caster", height: "6'1\"", weight: "230 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Nigel McGuinness", height: "6'3\"", weight: "211 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Bryan Danielson", nickname: "The American Dragon", height: "5'10\"", weight: "210 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Ricochet", nickname: "The One and Only", height: "5'9\"", weight: "188 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "PAC", nickname: "The Bastard", height: "5'8\"", weight: "217 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Shelton Benjamin", nickname: "The Gold Standard", height: "6'2\"", weight: "248 lbs", align: "TWEENER",
    gender: "MALE", companies: [AEW] },
  { name: "Toa Liona", height: "6'4\"", weight: "301 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Swerve Strickland", nickname: "The Realest", height: "6'1\"", weight: "240 lbs", align: "FACE",
    gender: "MALE", companies: [AEW] },
  { name: "Wheeler Yuta", height: "6'0\"", weight: "189 lbs", align: "HEEL",
    gender: "MALE", companies: [AEW] },
  { name: "Zack Wentz", height: "5'10\"", weight: "176 lbs", align: "TWEENER",
    gender: "MALE", companies: [AEW] },
  { name: "Trey Miguel", height: "5'9\"", weight: "172 lbs", align: "TWEENER",
    gender: "MALE", companies: [AEW] },
  // --- NJPW ------------------------------------------------------------------
  { name: "Kazuchika Okada", nickname: "The Rainmaker", height: "6'3\"", weight: "236 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Yota Tsuji", height: "6'0\"", weight: "227 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Will Ospreay", nickname: "The Aerial Assassin", height: "6'1\"", weight: "220 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Jay White", nickname: "Switchblade", height: "6'1\"", weight: "223 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Katsuhiko Nakajima", height: "5'9\"", weight: "209 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Kota Ibushi", nickname: "The Golden Star", height: "5'11\"", weight: "205 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Kento Miyahara", height: "6'1\"", weight: "240 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Aaron Wolf", height: "5'11\"", weight: "220 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Boltin Oleg", height: "6'2\"", weight: "265 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Callum Newman", height: "6'1\"", weight: "225 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Drilla Moloney", height: "5'10\"", weight: "220 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "El Phantasmo", nickname: "ELP", height: "6'0\"", weight: "186 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Gabe Kidd", height: "6'0\"", weight: "236 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Great O-Khan", nickname: "The Dominator", height: "6'2\"", weight: "265 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Hartley Jackson", height: "6'0\"", weight: "260 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Henare", nickname: "The Ultimate Weapon", height: "5'11\"", weight: "254 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Hirooki Goto", height: "6'0\"", weight: "227 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Jake Lee", height: "6'4\"", weight: "243 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Jeff Cobb", nickname: "Imperial Unit", height: "5'10\"", weight: "264 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Oskar", height: "6'7\"", weight: "254 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Ren Narita", height: "6'0\"", weight: "220 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Ryohei Oiwa", height: "5'11\"", weight: "243 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Shinsuke Nakamura", nickname: "The King of Strong Style", height: "6'2\"", weight: "220 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Sanada", nickname: "Cold Skull", height: "6'0\"", weight: "220 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Shun Skywalker", height: "6'0\"", weight: "198 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Tomohiro Ishii", nickname: "The Stone Pitbull", height: "5'7\"", weight: "220 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Yoshi-Hashi", height: "5'11\"", weight: "225 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Kaito Kiyomiya", height: "5'11\"", weight: "216 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Yuto-Ice", height: "5'11\"", weight: "231 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Yuya Uemura", height: "5'11\"", weight: "223 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Zack Sabre Jr.", nickname: "The Technical Wizard", height: "6'1\"", weight: "211 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Tama Tonga", height: "6'0\"", weight: "220 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Tanga Loa", height: "6'2\"", weight: "220 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Hikuleo", height: "6'8\"", weight: "265 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "EVIL", nickname: "The King of Darkness", height: "5'10\"", weight: "234 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Hiromu Takahashi", nickname: "The Ticking Time Bomb", height: "5'7\"", weight: "194 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Tetsuya Naito", nickname: "El Ingobernable", height: "5'11\"", weight: "225 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Clark Connors", nickname: "Wild Rhino", height: "5'8\"", weight: "202 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "David Finlay", height: "6'0\"", weight: "231 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Josh Alexander", nickname: "The Walking Weapon", height: "6'1\"", weight: "240 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Kevin Knight", height: "6'0\"", weight: "211 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Minoru Suzuki", nickname: "The King", height: "5'10\"", weight: "225 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Lance Archer", nickname: "The Murderhawk Monster", height: "6'8\"", weight: "289 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Titan", height: "5'7\"", weight: "187 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Místico", height: "5'7\"", weight: "180 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Nick Wayne", height: "6'1\"", weight: "179 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Kushida", nickname: "The Time Splitter", height: "5'8\"", weight: "154 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Mike Bailey", nickname: "Speedball", height: "5'8\"", weight: "174 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Tommy Billington", height: "5'8\"", weight: "180 lbs", align: "TWEENER",
    gender: "MALE", companies: [NJPW] },
  { name: "Roderick Strong", height: "5'10\"", weight: "200 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Steve Borden Jr.", height: "6'2\"", weight: "220 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] }, // estimated
  { name: "Kyle O'Reilly", height: "6'0\"", weight: "206 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Tommaso Ciampa", nickname: "The Blackheart", height: "5'11\"", weight: "208 lbs", align: "HEEL",
    gender: "MALE", companies: [NJPW] },
  { name: "Johnny Gargano", nickname: "Johnny Wrestling", height: "5'10\"", weight: "199 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Trent Beretta", height: "6'0\"", weight: "215 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  { name: "Rocky Romero", nickname: "Azucar", height: "5'8\"", weight: "176 lbs", align: "FACE",
    gender: "MALE", companies: [NJPW] },
  // --- Stardom ---------------------------------------------------------------
  { name: "Mercedes Moné", nickname: "The CEO", height: "5'5\"", weight: "114 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Saya Kamitani", height: "5'6\"", weight: "128 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Starlight Kid", height: "4'11\"", weight: "110 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "AZM", height: "5'1\"", weight: "121 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Hazuki", height: "5'1\"", weight: "115 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Julia Hart", height: "5'7\"", weight: "149 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Maika", height: "5'4\"", weight: "143 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Maki Itoh", nickname: "The Cutest in the World", height: "5'3\"", weight: "110 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Momo Watanabe", height: "5'2\"", weight: "132 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Natsuko Tora", height: "5'1\"", weight: "165 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Natsupoi", height: "5'0\"", weight: "104 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Sayaka Kurara", height: "5'3\"", weight: "123 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Skye Blue", height: "5'2\"", weight: "110 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Thekla", nickname: "The Spider", height: "5'1\"", weight: "115 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Utami Hayashishita", nickname: "The Red Queen", height: "5'5\"", weight: "143 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Miu Watanabe", nickname: "The Power Princess", height: "5'3\"", weight: "120 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] }, // estimated
  { name: "Yuki Arai", height: "5'5\"", weight: "119 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] }, // estimated
  { name: "Yuki Kamifuku", nickname: "Kamiyu", height: "5'8\"", weight: "117 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Miyu Yamashita", nickname: "The Pink Striker", height: "5'5\"", weight: "121 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] }, // estimated
  { name: "Alex Windsor", height: "5'5\"", weight: "139 lbs", align: "TWEENER",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Athena", nickname: "The Fallen Goddess", height: "5'3\"", weight: "120 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Billie Starkz", height: "5'5\"", weight: "108 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Hikaru Shida", height: "5'5\"", weight: "126 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Jamie Hayter", height: "5'8\"", weight: "143 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Kris Statlander", nickname: "The Galaxy's Greatest Alien", height: "5'9\"", weight: "143 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Lena Kross", height: "6'0\"", weight: "165 lbs", align: "TWEENER",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Maya World", height: "5'4\"", weight: "150 lbs", align: "TWEENER",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Megan Bayne", nickname: "The Unbreakable", height: "5'11\"", weight: "187 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Mina Shirakawa", nickname: "The Venus of Pro Wrestling", height: "5'2\"", weight: "119 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Queen Aminata", height: "5'9\"", weight: "145 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Riho", height: "5'1\"", weight: "99 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Yuka Sakazaki", nickname: "The Magical Girl", height: "5'2\"", weight: "128 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Zayda Steel", height: "5'4\"", weight: "119 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Asuka", nickname: "The Empress of Tomorrow", height: "5'3\"", weight: "132 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Bayley", nickname: "The Role Model", height: "5'6\"", weight: "119 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Io Shirai", nickname: "The Genius of the Sky", height: "5'1\"", weight: "119 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Liv Morgan", height: "5'3\"", weight: "125 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Kairi Hojo", nickname: "The Pirate Princess", height: "5'1\"", weight: "115 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Roxanne Perez", nickname: "The Prodigy", height: "5'1\"", weight: "110 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] }, // estimated
  { name: "Sol Ruca", height: "5'9\"", weight: "139 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Stephanie Vaquer", nickname: "La Primera", height: "5'4\"", weight: "110 lbs", align: "FACE",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Mariah May", nickname: "The Glamour", height: "5'8\"", weight: "136 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Giulia", nickname: "The Beautiful Madness", height: "5'4\"", weight: "121 lbs", align: "HEEL",
    gender: "FEMALE", companies: [STARDOM] },
  { name: "Tatum Paxley", height: "5'6\"", weight: "130 lbs", align: "TWEENER",
    gender: "FEMALE", companies: [STARDOM] }, // estimated
];

/**
 * Only used when a promotion is missing entirely. If you have already made your
 * own AEW, this script signs people to it and leaves your titles, series,
 * colour and spelling alone.
 */
const SCAFFOLD: Record<string, { name: string; color: string; titles: string[]; series: { name: string; startsOn: string; color: string }[] }> = {
  [AEW]: {
    name: "All Elite Wrestling",
    color: "#c8a24a",
    titles: [
      "AEW World Championship",
      "AEW International Championship",
      "AEW Continental Championship",
      "AEW TNT Championship",
      "AEW World Tag Team Championship",
      "AEW World Trios Championship",
    ],
    series: [
      { name: "AEW Dynamite", startsOn: "2026-08-26", color: "#c8a24a" },
      { name: "AEW Collision", startsOn: "2026-08-22", color: "#7c3aed" },
    ],
  },
  [NJPW]: {
    name: "New Japan Pro-Wrestling",
    color: "#e01e2b",
    titles: [
      "IWGP World Heavyweight Championship",
      "IWGP Global Heavyweight Championship",
      "IWGP Junior Heavyweight Championship",
      "NEVER Openweight Championship",
      "IWGP Tag Team Championship",
      "IWGP Junior Heavyweight Tag Team Championship",
    ],
    // Nothing weekly: New Japan runs tours and special events, which is exactly
    // the "a company may have zero weekly series" case.
    series: [],
  },
  [STARDOM]: {
    name: "World Wonder Ring Stardom",
    color: "#e6398f",
    titles: [
      "World of Stardom Championship",
      "Wonder of Stardom Championship",
      "IWGP Women's Championship",
      "Goddess of Stardom Championship",
      "Artist of Stardom Championship",
      "Future of Stardom Championship",
    ],
    series: [],
  },
};

async function main() {
  const worldId = process.argv[2];
  const world = worldId
    ? await db.world.findUniqueOrThrow({ where: { id: worldId } })
    : await db.world.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

  console.log(`Loading into "${world.name}" (${world.id})\n`);

  const companyIds = new Map<string, string>();
  for (const [key, plan] of Object.entries(SCAFFOLD)) {
    const existing =
      (await db.company.findFirst({ where: { worldId: world.id, abbreviation: key } })) ??
      (await db.company.findFirst({ where: { worldId: world.id, name: plan.name } }));

    if (existing) {
      companyIds.set(key, existing.id);
      console.log(`  = ${key} — using your "${existing.name}" as it stands`);
      continue;
    }

    const company = await db.company.create({
      data: { worldId: world.id, name: plan.name, abbreviation: key, color: plan.color },
    });
    companyIds.set(key, company.id);
    await db.title.createMany({
      data: plan.titles.map((name, index) => ({ companyId: company.id, name, order: index + 1 })),
    });
    for (const series of plan.series) {
      await db.weeklySeries.create({
        data: {
          companyId: company.id,
          name: series.name,
          cadence: "WEEKLY",
          startsOn: new Date(`${series.startsOn}T00:00:00.000Z`),
          color: series.color,
        },
      });
    }
    console.log(`  + ${key} — created, with ${plan.titles.length} titles and ${plan.series.length} series`);
  }
  console.log("");

  let created = 0;
  let skipped = 0;
  let filled = 0;

  for (const person of ROSTER) {
    const existing = await db.wrestler.findFirst({ where: { worldId: world.id, name: person.name } });
    if (existing) {
      // Someone already here keeps everything they have. A blank field is the
      // only thing this fills, so re-running after finding a better source
      // tops up the gaps without overwriting anything you typed yourself.
      const fill = {
        ...(existing.nickname === null && person.nickname ? { nickname: person.nickname } : {}),
        ...(existing.height === null && person.height ? { height: person.height } : {}),
        ...(existing.weight === null && person.weight ? { weight: person.weight } : {}),
        ...(existing.gender === null ? { gender: person.gender } : {}),
      };
      if (Object.keys(fill).length > 0) {
        await db.wrestler.update({ where: { id: existing.id }, data: fill });
        filled += 1;
      }
      skipped += 1;
      continue;
    }

    const wrestler = await db.wrestler.create({
      data: {
        worldId: world.id,
        name: person.name,
        nickname: person.nickname ?? null,
        height: person.height ?? null,
        weight: person.weight ?? null,
        align: person.align,
        gender: person.gender,
      },
    });

    for (const [index, companyName] of person.companies.entries()) {
      await db.contract.create({
        data: {
          worldId: world.id,
          wrestlerId: wrestler.id,
          companyId: companyIds.get(companyName)!,
          isPrimary: index === 0,
        },
      });
    }

    created += 1;
  }

  console.log(`  + ${created} wrestlers (${skipped} already present, ${filled} topped up)`);
  for (const key of Object.keys(SCAFFOLD)) {
    const size = ROSTER.filter((p) => p.companies.includes(key)).length;
    console.log(`      ${key.padEnd(8)} ${size}`);
  }
  console.log("\nTitles start vacant — a lineage only begins when you play a title match.");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
