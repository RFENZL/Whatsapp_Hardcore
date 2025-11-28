# Documentation de l'API REST


## Route `auth`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `POST` | `/auth/register` |
| `POST` | `/auth/login` |
| `POST` | `/auth/logout` |
| `POST` | `/auth/refresh` |
| `GET` | `/auth/verify-email` |
| `POST` | `/auth/forgot-password` |
| `POST` | `/auth/reset-password` |
| `GET` | `/auth/me` |


## Route `contacts`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `GET` | `/contacts/` |
| `POST` | `/contacts/` |
| `DELETE` | `/contacts/:contactId` |
| `POST` | `/contacts/:contactId/block` |
| `POST` | `/contacts/:contactId/unblock` |
| `POST` | `/contacts/:contactId/favorite` |
| `PUT` | `/contacts/:contactId/notes` |


## Route `conversations`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `POST` | `/conversations/direct` |
| `GET` | `/conversations/` |
| `GET` | `/conversations/:id` |
| `POST` | `/conversations/:id/archive` |
| `POST` | `/conversations/:id/unarchive` |
| `POST` | `/conversations/:id/toggle-mute` |
| `POST` | `/conversations/:id/pin` |
| `POST` | `/conversations/:id/unpin` |
| `DELETE` | `/conversations/:id` |
| `POST` | `/conversations/:id/mark-read` |
| `POST` | `/conversations/:id/background-color` |


## Route `groups`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `POST` | `/groups/` |
| `GET` | `/groups/:id` |
| `PUT` | `/groups/:id` |
| `POST` | `/groups/:id/members` |
| `DELETE` | `/groups/:id/members/:memberId` |
| `POST` | `/groups/:id/leave` |
| `POST` | `/groups/:id/members/:memberId/promote` |
| `PUT` | `/groups/:id/settings` |
| `POST` | `/groups/:id/invite` |
| `POST` | `/groups/join/:code` |
| `DELETE` | `/groups/:id/invite` |
| `POST` | `/groups/:id/ban` |
| `POST` | `/groups/:id/unban` |
| `GET` | `/groups/:id/history` |
| `GET` | `/groups/:id/banned` |


## Route `images`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `GET` | `/images/` |


## Route `medias`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `POST` | `/medias/` |
| `GET` | `/medias/conversation/:conversationId` |
| `GET` | `/medias/stats` |
| `GET` | `/medias/:id/stream` |
| `GET` | `/medias/:id` |
| `DELETE` | `/medias/:id` |


## Route `messages`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `POST` | `/messages/` |
| `GET` | `/messages/search` |
| `GET` | `/messages/search/advanced` |
| `GET` | `/messages/conversation/:conversationId/pinned` |
| `GET` | `/messages/conversations` |
| `GET` | `/messages/conversation/:conversationId` |
| `POST` | `/messages/:messageId/forward` |
| `POST` | `/messages/delivered` |
| `GET` | `/messages/:user_id` |
| `PUT` | `/messages/:id` |
| `DELETE` | `/messages/:id` |
| `POST` | `/messages/:id/read` |
| `POST` | `/messages/:id/pin` |
| `DELETE` | `/messages/:id/pin` |


## Route `notifications`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `GET` | `/notifications/` |
| `GET` | `/notifications/unread-count` |
| `PUT` | `/notifications/mark-all-read` |
| `DELETE` | `/notifications/clear-read` |
| `PUT` | `/notifications/:id/read` |
| `PUT` | `/notifications/:id/archive` |
| `DELETE` | `/notifications/:id` |


## Route `reactions`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `POST` | `/reactions/messages/:messageId` |
| `GET` | `/reactions/messages/:messageId` |
| `GET` | `/reactions/conversations/:conversationId/user` |
| `DELETE` | `/reactions/:reactionId` |


## Route `upload`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `POST` | `/upload/` |


## Route `users`

Endpoints détectés :

| Méthode | Chemin |
|--------|--------|

| `GET` | `/users/search` |
| `GET` | `/users/sessions` |
| `DELETE` | `/users/sessions/:sessionId` |
| `POST` | `/users/sessions/delete-all` |
| `GET` | `/users/:id` |
| `GET` | `/users/` |
| `PUT` | `/users/profile` |
| `DELETE` | `/users/account` |
