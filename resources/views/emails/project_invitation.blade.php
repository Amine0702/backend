@component('mail::message')
# Invitation à rejoindre un projet

Bonjour,

Vous avez été invité(e) à rejoindre le projet **{{ $project->name }}** avec le rôle de **{{ $role }}**.

## Détails du projet :
- **Nom :** {{ $project->name }}
- **Description :** {{ $project->description ?? 'Aucune description' }}
- **Votre rôle :** {{ ucfirst($role) }}

@component('mail::button', ['url' => $joinLink])
Accepter l'invitation
@endcomponent

Si vous ne souhaitez pas rejoindre ce projet, vous pouvez ignorer cet email.

**Note :** Ce lien d'invitation est unique et ne peut être utilisé qu'une seule fois.

Merci,<br>
L'équipe {{ config('app.name') }}

---
Si vous avez des difficultés à cliquer sur le bouton "Accepter l'invitation", copiez et collez l'URL suivante dans votre navigateur web :
{{ $joinLink }}
@endcomponent
