import { Env } from "./config";
import { ApiModuleData, SemVerObject } from "./types";

export async function postVersion(
  env: Env,
  module: ApiModuleData,
  version: SemVerObject
) {
  await fetch(env.DISCORD_WEBHOOK_PUBLIC, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "mashin",
      avatar_url:
        "https://cdn.discordapp.com/avatars/411256446638882837/9a12fc7810795ded801fdb0401db0be6.png",
      content: `New ${module.type} added to the registry: ${module.name}@${version.version}`,

      // embeds to be sent
      embeds: [
        {
          color: 16744576,
          author: {
            name: module.owner,
            url: `https://github.com/${module.owner}`,
            icon_url: `https://github.com/${module.owner}.png`,
          },
          title: `${module.name} ${version.version}`,
          url: `https://mashin.run/${module.name}@${version.version}`,
          description: module.description,
          fields: [
            {
              name: "repository",
              value: `https://github.com/${module.owner}/${module.repo}`,
            },
            {
              name: "documentation",
              value: `https://mashin.run/${module.name}@${version.version}/doc`,
            },
          ],
        },
      ],
    }),
  });
}
