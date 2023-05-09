# Mashin Registry

This Cloudflare Worker acts as a registry for Mashin, allowing users to easily import custom providers using a simple URL scheme. Users can import providers like this:

```ts
import * as mysql from "https://mashin.run/mysql@0.1.1/mod.ts";
```

## Publishing a Module to the Registry

To publish a module to the registry, you need to set up a GitHub webhook for the repository containing your provider.

Follow these steps:

1. Navigate to the repository you want to add.
2. Go to the Settings tab.
3. Click on the Webhooks tab.
4. Click on the Add webhook button.
5. Enter the following URL in the Payload URL field, replacing `{provider_name}` with the desired name for your provider: `https://mashin.run/webhook/github/{provider_name}`

6. Select application/json as the content type.

7. Select "Let me select individual events."

8. Select only the "Release" event.
9. Press "Add webhook."

After setting up the webhook, the registry will automatically extract previous releases and add any new releases as they are published.

This process is fully compatible with the GitHub Actions provided in the [mashin_provider_starter](https://github.com/nutshimit/mashin_provider_starter) template.

## Error Handling

The Cloudflare Worker will return appropriate error responses for various error conditions, such as invalid paths, invalid modules, or unsupported request types.

## Deployment

To deploy this Cloudflare Worker, follow the official Cloudflare Workers documentation.

## Contributing

Contributions are welcome! If you have any suggestions, ideas, or improvements, feel free to submit a pull request or open an issue. Let's make this project built by and owned by the community!
