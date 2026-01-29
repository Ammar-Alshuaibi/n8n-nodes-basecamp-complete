# n8n-nodes-basecamp-complete

A comprehensive n8n community node for [Basecamp 4](https://basecamp.com/) - the popular project management and team communication platform by 37signals.

![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-orange)
![npm version](https://img.shields.io/npm/v/n8n-nodes-basecamp-complete)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

## Features

- ✅ **Full Basecamp 4 API coverage** - All major resources supported
- ✅ **OAuth2 authentication** - Secure token-based auth via 37signals Launchpad
- ✅ **Automatic token refresh** - Never worry about expired tokens
- ✅ **23 resources** - Projects, To-Dos, Messages, Campfires, Kanban Cards, and more

## Installation

### Method 1: Via n8n Community Nodes UI (Recommended)

1. Go to **Settings** → **Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-basecamp-complete`
4. Click **Install**
5. Restart n8n

### Method 2: Via npm (Self-Hosted)

```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the package
npm install n8n-nodes-basecamp-complete

# Restart n8n
```

### Method 3: Docker

Add the package name to the `N8N_COMMUNITY_PACKAGES` environment variable:

```yaml
environment:
  - N8N_COMMUNITY_PACKAGES=n8n-nodes-basecamp-complete
```

## Credentials Setup

### 1. Create a Basecamp Integration

1. Go to [37signals Launchpad Integrations](https://launchpad.37signals.com/integrations)
2. Click **Register another application**
3. Fill in:
   - **Name**: Your app name (e.g., "n8n Integration")
   - **Company**: Your company name
   - **Website URL**: Your website
   - **Redirect URI**: `https://your-n8n-instance.com/rest/oauth2-credential/callback`
4. Click **Register this app**
5. Copy the **Client ID** and **Client Secret**

### 2. Configure n8n Credentials

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **Basecamp OAuth2 API**
3. Enter your **Client ID** and **Client Secret**
4. Click **Connect my account**
5. Authorize the app in Basecamp
6. Select your Basecamp account when prompted

## Supported Resources & Operations

| Resource | Operations | Description |
|----------|------------|-------------|
| **Project** | Create, Delete, Get, Get Many, Update | Manage Basecamp projects |
| **To-Do List** | Create, Get, Get Many | Organize tasks into lists |
| **To-Do** | Create, Get, Get Many, Update, Complete | Task management |
| **Message** | Create, Get, Get Many | Message board posts |
| **Comment** | Create, Get Many | Comments on any recordable |
| **Campfire** | Get | Real-time chat rooms |
| **Campfire Line** | Create, Get, Get Many, Delete | Chat messages |
| **Card Table** | Get | Kanban boards |
| **Card** | Create, Get, Get Many, Update | Kanban cards |
| **Document** | Create, Get, Get Many, Update | Docs & Files |
| **Event** | Get Many | Activity log entries |
| **Person** | Get, Get Many, Get My Profile | Team members |
| **Question** | Get, Get Many | Automatic check-ins |
| **Question Answer** | Get Many | Check-in responses |
| **Schedule Entry** | Create, Get, Get Many, Update | Calendar events |
| **Template** | Get, Get Many, Create Project | Project templates |
| **Upload** | Get, Get Many | File attachments |
| **Vault** | Create, Get, Get Many, Update | File folders |
| **Webhook** | Create, Delete, Get Many, Update | Webhook management |

## Example Workflows

### Create a To-Do when receiving an email
**Email Trigger** → **Basecamp** (Create To-Do)

### Post to Campfire on Slack message
**Slack Trigger** → **Basecamp** (Create Campfire Line)

### Sync projects with Google Sheets
**Schedule Trigger** → **Basecamp** (Get Many Projects) → **Google Sheets** (Append)

## Token Refresh

This node automatically handles OAuth2 token refresh. Basecamp tokens expire after 2 weeks, but:

- ✅ Tokens refresh automatically when workflows run
- ✅ No manual reconnection needed for active workflows
- ⚠️ If unused for 2+ weeks, you may need to reconnect manually

## Troubleshooting

### "Unsupported type" OAuth Error
Make sure you're using version 1.0.2 or later which includes the required `type=web_server` parameter.

### Token Expired
Run any workflow using the Basecamp credential - it will auto-refresh. If that fails, delete and recreate the credential.

### Rate Limits
Basecamp allows 50 requests per 10 seconds. The node handles pagination automatically.

## Support

- 📖 [Basecamp API Documentation](https://github.com/basecamp/bc3-api)
- 💬 [n8n Community Forum](https://community.n8n.io/)
- 🐛 [Report Issues](https://github.com/Ammar-Alshuaibi/n8n-nodes-basecamp/issues)

## License

MIT License

## Author

Ammar Alshuaibi

---

Made with ❤️ for the n8n community
