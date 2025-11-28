# Modèles de données


## Contact

Champs principaux (extrait du schéma Mongoose) :

```js
type: Boolean,
type: Boolean,
type: String,
type: Date,
```


## Conversation

Champs principaux (extrait du schéma Mongoose) :

```js
type: {
type: String,
type: Date,
type: Map,
type: Date,
type: Date,
type: Map,
type: Map,
```


## Group

Champs principaux (extrait du schéma Mongoose) :

```js
type: String,
type: String,
type: String,
type: Date,
type: String,
type: String,
type: Date,
type: Date,
type: String,
type: String,
type: Boolean,
type: Date,
type: Date,
type: Number,
type: Number,
type: String,
type: String,
type: String,
type: Date,
type: Date,
```


## Media

Champs principaux (extrait du schéma Mongoose) :

```js
type: {
type: String,
type: String,
type: String,
type: String,
type: String,
type: Number,
width: { type: Number, default: null },
height: { type: Number, default: null }
type: Number,
type: String,
type: String,
type: String,
type: Map,
type: Date,
type: Date,
```


## Message

Champs principaux (extrait du schéma Mongoose) :

```js
content: { type: String, maxlength: 5000, default: '' },
type: {
type: String,
mediaUrl: { type: String, default: '' },
mediaName: { type: String, default: '' },
mediaSize: { type: Number, default: 0 },
mediaMimeType: { type: String, default: '' },
createdAt: { type: Date, default: Date.now, index: true },
readAt: { type: Date, default: Date.now }
status: { type: String, enum: ['pending', 'sent', 'delivered', 'read'], default: 'pending' },
pending: { type: Date, default: Date.now },
sent: { type: Date, default: null },
delivered: { type: Date, default: null },
read: { type: Date, default: null }
edited: { type: Boolean, default: false },
editedAt: { type: Date, default: null },
deleted: { type: Boolean, default: false },
deletedAt: { type: Date, default: null },
expiresAt: { type: Date, default: null, index: true },
isPinned: { type: Boolean, default: false },
```


## Notification

Champs principaux (extrait du schéma Mongoose) :

```js
type: {
type: String,
type: String,
type: String,
type: String,
type: String,
type: String,
type: Date,
type: Date,
type: Date,
type: notificationData.type,
```


## Reaction

Champs principaux (extrait du schéma Mongoose) :

```js
type: String,
type: Date,
```


## Session

Champs principaux (extrait du schéma Mongoose) :

```js
type: String,
type: String,
country: { type: String, default: '' },
countryCode: { type: String, default: '' },
region: { type: String, default: '' },
city: { type: String, default: '' },
timezone: { type: String, default: '' }
type: Date,
type: Date,
type: Boolean,
```


## User

Champs principaux (extrait du schéma Mongoose) :

```js
email: { type: String, required: true, unique: true, lowercase: true, trim: true },
username: { type: String, required: true, unique: true, minlength: 3, maxlength: 30, trim: true },
password: { type: String, required: true, minlength: 6, select: false },
avatar: { type: String, default: '' },
bio: { type: String, default: '', maxlength: 500 },
type: String,
message: { type: String, default: '', maxlength: 100 },
emoji: { type: String, default: '' },
expiresAt: { type: Date, default: null }
createdAt: { type: Date, default: Date.now },
lastSeen: { type: Date, default: null },
type: Map,
refreshToken: { type: String, select: false },
isEmailVerified: { type: Boolean, default: false },
emailVerificationToken: { type: String, select: false },
passwordResetToken: { type: String, select: false },
passwordResetExpires: { type: Date, select: false },
deletedAt: { type: Date, default: null, select: false }
```
