import { NextApiRequest, NextApiResponse } from "next";
import { defaultInlineCSS, defaultTiers, fetchSponsors, loadConfig, presets, resolveAvatars, SponsorkitConfig, Sponsorship, SvgComposer  } from 'sponsorkit'


async function defaultComposer(
  composer: SvgComposer,
  sponsors: Sponsorship[],
  config: SponsorkitConfig
) {
  const tiers = config.tiers!.sort(
    (a, b) => (b.monthlyDollars ?? 0) - (a.monthlyDollars ?? 0)
  );

  const finalSponsors = config.tiers!.filter(
    (i) => i.monthlyDollars == null || i.monthlyDollars === 0
  );

  if (finalSponsors.length !== 1)
    throw new Error(
      `There should be exactly one tier with no \`monthlyDollars\`, but got ${finalSponsors.length}`
    );

  const partitions: Sponsorship[][] = Array.from(
    { length: tiers.length },
    () => []
  );

  sponsors
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((i) => {
      let index =
        tiers.findIndex((t) => i.monthlyDollars >= (t.monthlyDollars || 0)) ||
        0;
      if (index === -1) index = 0;
      partitions[index].push(i);
    });

  composer.addSpan(config.padding?.top ?? 20);

  tiers.forEach((t, i) => {
    const sponsors = partitions[i];
    t.composeBefore?.(composer, sponsors, config);
    if (t.compose) {
      t.compose(composer, sponsors, config);
    } else {
      if (sponsors.length) {
        const paddingTop = t.padding?.top ?? 20;
        const paddingBottom = t.padding?.bottom ?? 10;
        if (paddingTop) composer.addSpan(paddingTop);
        if (t.title) {
          composer.addTitle(t.title).addSpan(5);
        }
        composer.addSponsorGrid(sponsors, t.preset || presets.base);
        if (paddingBottom) composer.addSpan(paddingBottom);
      }
    }
    t.composeAfter?.(composer, sponsors, config);
  });

  composer.addSpan(config.padding?.bottom ?? 20);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const config = {
      login: process.env.LOGIN || process.env.VERCEL_GIT_REPO_OWNER,
      token: process.env.TOKEN,
      tiers: defaultTiers,
    } as SponsorkitConfig;

    const sponsors = await fetchSponsors(config.token, config.login)
    await resolveAvatars(sponsors)

    const composer = new SvgComposer(await loadConfig(config))
    await defaultComposer(composer, sponsors, config)

    const svg = composer.generateSvg()

    res.statusCode = 200
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(svg)
  }
}