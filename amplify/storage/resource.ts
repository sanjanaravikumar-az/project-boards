import { defineStorage } from "@aws-amplify/backend";

const branchName = process.env.AWS_BRANCH ?? "sandbox";

export const storage = defineStorage({ name: `projectboards77b21c06c37841ddbdea3f8bed8abc9c39290-${branchName}`, access: allow => ({
        "public/*": [allow.guest.to(["read"]), allow.authenticated.to(["write", "read", "delete"])],
        "protected/{entity_id}/*": [allow.authenticated.to(["write", "read", "delete"])],
        "private/{entity_id}/*": [allow.authenticated.to(["write", "read", "delete"])]
    }) });
