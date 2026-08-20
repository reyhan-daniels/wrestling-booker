/**
 * Loads a real-world starting roster: the top men's talent of WWE, AEW and
 * NJPW, plus each promotion's companies, championships and weekly series.
 *
 *   npm run seed:real                      # into the first world
 *   npm run seed:real -- <worldId>         # into a specific world
 *
 * Safe to re-run: everything is matched by name and created only if missing,
 * so it never duplicates and never touches shows or results.
 *
 * Sources: billed height/weight from each wrestler's Wikipedia infobox;
 * roster membership and current champions from thesmackdownhotel.com roster
 * pages dated 18-20 August 2026. Alignment is a judgement call about how each
 * man is being presented, and is the field most likely to be stale.
 * Signature moves are left empty where the finisher could not be confirmed.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Alignment } from "../src/generated/prisma/enums";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type Person = {
  name: string;
  nickname?: string;
  height: string;
  weight: string;
  align: Alignment;
  moves?: string[];
  /** Primary promotion first; a second entry is a genuine dual commitment. */
  companies: string[];
};

const WWE = "World Wrestling Entertainment";
const AEW = "All Elite Wrestling";
const NJPW = "New Japan Pro-Wrestling";

const ROSTER: Person[] = [
  // --- WWE ----------------------------------------------------------------
  { name: "Cody Rhodes", nickname: "The American Nightmare", height: "6'2\"", weight: "222 lbs", align: "FACE",
    moves: ["Cross Rhodes", "Cody Cutter", "Disaster Kick", "Bionic Elbow"], companies: [WWE] },
  { name: "CM Punk", nickname: "The Best in the World", height: "6'2\"", weight: "218 lbs", align: "FACE",
    moves: ["Go To Sleep", "Anaconda Vise", "Pepsi Plunge"], companies: [WWE] },
  { name: "Roman Reigns", nickname: "The Tribal Chief", height: "6'3\"", weight: "265 lbs", align: "TWEENER",
    moves: ["Spear", "Superman Punch", "Guillotine Choke", "Drive By"], companies: [WWE] },
  { name: "Seth Rollins", nickname: "The Visionary", height: "6'1\"", weight: "225 lbs", align: "HEEL",
    moves: ["The Stomp", "Pedigree", "Falcon Arrow", "Superkick"], companies: [WWE] },
  { name: "Gunther", nickname: "The Ring General", height: "6'4\"", weight: "250 lbs", align: "HEEL",
    moves: ["Powerbomb", "Sleeper Hold", "Knife-Edge Chop", "Lariat"], companies: [WWE] },
  { name: "LA Knight", nickname: "The Megastar", height: "6'1\"", weight: "240 lbs", align: "FACE",
    moves: ["Blunt Force Trauma", "Neckbreaker"], companies: [WWE] },
  { name: "Jey Uso", nickname: "Main Event Jey Uso", height: "6'2\"", weight: "242 lbs", align: "FACE",
    moves: ["Uso Splash", "Spear", "Superkick"], companies: [WWE] },
  { name: "Bron Breakker", height: "6'0\"", weight: "250 lbs", align: "HEEL",
    moves: ["Spear", "Steiner Recliner", "Gorilla Press Slam", "Frankensteiner"], companies: [WWE] },
  { name: "Randy Orton", nickname: "The Viper", height: "6'5\"", weight: "275 lbs", align: "FACE",
    moves: ["RKO", "Punt Kick", "Draping DDT"], companies: [WWE] },
  { name: "Jacob Fatu", nickname: "The Samoan Werewolf", height: "6'2\"", weight: "285 lbs", align: "HEEL",
    moves: ["Moonsault", "Superkick", "Samoan Drop", "Pop-up Samoan Drop"], companies: [WWE] },
  { name: "Solo Sikoa", height: "6'2\"", weight: "250 lbs", align: "HEEL",
    moves: ["Samoan Spike", "Spinning Solo", "Running Hip Attack"], companies: [WWE] },
  { name: "Finn Bálor", nickname: "The Demon", height: "5'11\"", weight: "190 lbs", align: "HEEL",
    moves: ["Coup de Grâce", "1916", "Sling Blade", "Shotgun Dropkick"], companies: [WWE] },
  { name: "Shinsuke Nakamura", nickname: "The King of Strong Style", height: "6'2\"", weight: "220 lbs", align: "HEEL",
    moves: ["Kinshasa", "Landslide", "Inverted Exploder Suplex"], companies: [WWE] },
  { name: "Chad Gable", height: "5'8\"", weight: "202 lbs", align: "HEEL",
    moves: ["Chaos Theory", "Ankle Lock", "Moonsault"], companies: [WWE] },
  { name: "Baron Corbin", nickname: "The Lone Wolf", height: "6'8\"", weight: "285 lbs", align: "HEEL",
    moves: ["End of Days", "Deep Six", "Chokeslam"], companies: [WWE] },

  // --- AEW ----------------------------------------------------------------
  { name: "Kenny Omega", nickname: "The Cleaner", height: "6'0\"", weight: "229 lbs", align: "FACE",
    moves: ["One Winged Angel", "V-Trigger", "Snap Dragon Suplex", "Croyt's Wrath"], companies: [AEW] },
  { name: "Jon Moxley", nickname: "The Purveyor of Violence", height: "6'4\"", weight: "231 lbs", align: "HEEL",
    moves: ["Death Rider", "Paradigm Shift", "Bulldog Choke", "King Kong Lariat"], companies: [AEW, NJPW] },
  { name: "Adam Page", nickname: "Hangman", height: "6'1\"", weight: "229 lbs", align: "FACE",
    moves: ["Buckshot Lariat", "Deadeye", "Fall From Grace"], companies: [AEW] },
  { name: "Swerve Strickland", nickname: "The Realest", height: "6'1\"", weight: "240 lbs", align: "FACE",
    moves: ["Swerve Stomp", "House Call", "JML Driver"], companies: [AEW] },
  { name: "MJF", nickname: "The Salt of the Earth", height: "5'11\"", weight: "226 lbs", align: "HEEL",
    moves: ["Heatseeker", "Salt of the Earth", "Kangaroo Kick"], companies: [AEW] },
  { name: "Will Ospreay", nickname: "The Aerial Assassin", height: "6'1\"", weight: "220 lbs", align: "FACE",
    moves: ["Hidden Blade", "Stormbreaker", "Os-Cutter", "Oscutter"], companies: [AEW, NJPW] },
  { name: "Kazuchika Okada", nickname: "The Rainmaker", height: "6'3\"", weight: "236 lbs", align: "HEEL",
    moves: ["Rainmaker", "Money Clip", "Tombstone Piledriver", "Cobra Flowsion"], companies: [AEW] },
  { name: "Konosuke Takeshita", nickname: "The Alpha", height: "6'2\"", weight: "251 lbs", align: "HEEL",
    moves: ["Raging Fire", "Blue Thunder Bomb", "Running Knee"], companies: [AEW, NJPW] },
  { name: "Darby Allin", height: "5'8\"", weight: "180 lbs", align: "FACE",
    moves: ["Coffin Drop", "Last Supper", "Stunner"], companies: [AEW] },
  { name: "Adam Cole", nickname: "Panama City Playboy", height: "6'0\"", weight: "200 lbs", align: "FACE",
    moves: ["Boom", "Panama Sunrise", "The Last Shot", "Superkick"], companies: [AEW] },
  { name: "Kyle Fletcher", nickname: "Protostar", height: "6'3\"", weight: "240 lbs", align: "HEEL",
    moves: ["Brainbuster", "Grimstone"], companies: [AEW] },
  { name: "Samoa Joe", nickname: "King Joe", height: "6'2\"", weight: "282 lbs", align: "TWEENER",
    moves: ["Coquina Clutch", "Muscle Buster", "Senton"], companies: [AEW] },
  { name: "Orange Cassidy", nickname: "Freshly Squeezed", height: "5'10\"", weight: "161 lbs", align: "FACE",
    moves: ["Orange Punch", "Beach Break", "Stundog Millionaire"], companies: [AEW] },
  { name: "Jay White", nickname: "Switchblade", height: "6'1\"", weight: "223 lbs", align: "HEEL",
    moves: ["Blade Runner", "Kiwi Krusher", "Sleeper Suplex"], companies: [AEW] },
  { name: "Kevin Knight", height: "6'0\"", weight: "211 lbs", align: "FACE",
    moves: ["Flying Dropkick"], companies: [AEW] },

  // --- NJPW ---------------------------------------------------------------
  { name: "Yota Tsuji", height: "5'11\"", weight: "227 lbs", align: "TWEENER",
    moves: ["Gene Blaster"], companies: [NJPW] },
  { name: "Gabe Kidd", height: "6'0\"", weight: "236 lbs", align: "HEEL",
    companies: [NJPW, AEW] },
  { name: "YOH", height: "5'7\"", weight: "187 lbs", align: "FACE",
    moves: ["Direct Drive", "Five Star Clutch"], companies: [NJPW] },
  { name: "Aaron Wolf", height: "5'11\"", weight: "220 lbs", align: "FACE",
    companies: [NJPW] },
  { name: "Great-O-Khan", height: "6'2\"", weight: "265 lbs", align: "HEEL",
    moves: ["Eliminator", "Sheep Killer"], companies: [NJPW] },
  { name: "HENARE", nickname: "The Ultimate Weapon", height: "5'11\"", weight: "254 lbs", align: "TWEENER",
    moves: ["Streets of Rage", "Rampage Tackle", "Berserker Bomb"], companies: [NJPW] },
  { name: "Shingo Takagi", nickname: "The Rampage Dragon", height: "5'10\"", weight: "220 lbs", align: "FACE",
    moves: ["Last of the Dragon", "Pumping Bomber", "Made in Japan"], companies: [NJPW] },
  { name: "SANADA", nickname: "Cold Blooded Snake", height: "5'11\"", weight: "220 lbs", align: "HEEL",
    moves: ["Deadfall", "Skull End", "Shining Wizard"], companies: [NJPW] },
  { name: "El Desperado", height: "5'9\"", weight: "198 lbs", align: "FACE",
    moves: ["Pinche Loco", "Numero Dos", "Guitarra de Ángel"], companies: [NJPW] },
  { name: "Hirooki Goto", height: "6'0\"", weight: "227 lbs", align: "FACE",
    moves: ["GTR", "Shouten Kai", "Ushigoroshi"], companies: [NJPW] },
  { name: "Shota Umino", nickname: "Roughneck", height: "6'0\"", weight: "205 lbs", align: "FACE",
    companies: [NJPW] },
  { name: "Tomohiro Ishii", nickname: "The Stone Pitbull", height: "5'7\"", weight: "220 lbs", align: "FACE",
    moves: ["Vertical Drop Brainbuster", "Sliding Lariat", "Sheer Drop Brainbuster"], companies: [NJPW, AEW] },
];

const COMPANIES = [
  { name: WWE, abbreviation: "WWE", color: "#c8102e" },
  { name: AEW, abbreviation: "AEW", color: "#c8a24a" },
  { name: NJPW, abbreviation: "NJPW", color: "#e01e2b" },
];

const TITLES: Record<string, string[]> = {
  [WWE]: [
    "Undisputed WWE Championship",
    "World Heavyweight Championship",
    "WWE Intercontinental Championship",
    "WWE United States Championship",
    "WWE Tag Team Championship",
  ],
  [AEW]: [
    "AEW World Championship",
    "AEW International Championship",
    "AEW TNT Championship",
    "AEW Continental Championship",
    "AEW World Tag Team Championship",
  ],
  [NJPW]: [
    "IWGP World Heavyweight Championship",
    "IWGP Global Heavyweight Championship",
    "IWGP Junior Heavyweight Championship",
    "NEVER Openweight Championship",
    "IWGP Tag Team Championship",
  ],
};

// NJPW deliberately gets none: it runs tours and special events, which is
// exactly the "a company may have zero weekly series" case.
const SERIES: { company: string; name: string; startsOn: string }[] = [
  { company: WWE, name: "Monday Night Raw", startsOn: "2026-08-24" },
  { company: WWE, name: "Friday Night SmackDown", startsOn: "2026-08-21" },
  { company: AEW, name: "AEW Dynamite", startsOn: "2026-08-26" },
  { company: AEW, name: "AEW Collision", startsOn: "2026-08-22" },
];

async function main() {
  const worldId = process.argv[2];
  const world = worldId
    ? await db.world.findUniqueOrThrow({ where: { id: worldId } })
    : await db.world.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

  console.log(`Loading into "${world.name}" (${world.id})\n`);

  const companyIds = new Map<string, string>();
  for (const company of COMPANIES) {
    const existing = await db.company.findFirst({ where: { worldId: world.id, name: company.name } });
    const row = existing ?? (await db.company.create({ data: { ...company, worldId: world.id } }));
    companyIds.set(company.name, row.id);
    console.log(`${existing ? "  =" : "  +"} ${company.abbreviation}`);
  }

  let titleCount = 0;
  for (const [companyName, titles] of Object.entries(TITLES)) {
    const companyId = companyIds.get(companyName)!;
    for (const name of titles) {
      const existing = await db.title.findFirst({ where: { companyId, name } });
      if (!existing) {
        await db.title.create({ data: { companyId, name } });
        titleCount += 1;
      }
    }
  }
  console.log(`  + ${titleCount} titles`);

  let seriesCount = 0;
  for (const series of SERIES) {
    const companyId = companyIds.get(series.company)!;
    const existing = await db.weeklySeries.findFirst({ where: { companyId, name: series.name } });
    if (!existing) {
      await db.weeklySeries.create({
        data: {
          companyId,
          name: series.name,
          cadence: "WEEKLY",
          startsOn: new Date(`${series.startsOn}T00:00:00.000Z`),
        },
      });
      seriesCount += 1;
    }
  }
  console.log(`  + ${seriesCount} weekly series\n`);

  let created = 0;
  let skipped = 0;
  let dual = 0;

  for (const person of ROSTER) {
    const existing = await db.wrestler.findFirst({ where: { worldId: world.id, name: person.name } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const wrestler = await db.wrestler.create({
      data: {
        worldId: world.id,
        name: person.name,
        nickname: person.nickname ?? null,
        height: person.height,
        weight: person.weight,
        align: person.align,
        signatureMoves: person.moves ?? [],
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

    if (person.companies.length > 1) dual += 1;
    created += 1;
  }

  console.log(`  + ${created} wrestlers (${skipped} already present)`);
  console.log(`  + ${dual} of them working two promotions\n`);
  console.log("Titles start vacant — a lineage only begins when you play a title match.");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
