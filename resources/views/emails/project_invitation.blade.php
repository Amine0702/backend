@component('mail::message')
# Invitation à rejoindre un projet

Vous avez été invité(e) à rejoindre le projet **{{ $project->name }}** avec le rôle de **{{ ucfirst($role) }}**.

## Détails du projet :

**Description :**
{{ $project->description }}

**Dates importantes :**
- **Début :** {{ \Carbon\Carbon::parse($project->start_date)->format('d/m/Y') }}
- **Fin :** {{ \Carbon\Carbon::parse($project->end_date)->format('d/m/Y') }}

## Votre rôle : {{ ucfirst($role) }}

@if($role == 'observer')
En tant qu'**Observateur**, vous pourrez voir les tâches mais ne pourrez pas les modifier.
@elseif($role == 'member')
En tant que **Membre**, vous pourrez modifier vos propres tâches et en créer de nouvelles.
@elseif($role == 'manager')
En tant que **Manager**, vous aurez un accès complet, pourrez assigner des tâches et modifier toutes les tâches.
@endif

Nous serions ravis de vous avoir à bord pour ce projet. Si vous êtes prêt(e) à rejoindre l'équipe, cliquez sur le bouton ci-dessous.

@component('mail::button', ['url' => $joinLink])
Rejoindre le projet
@endcomponent

Si vous avez des questions, n'hésitez pas à nous contacter.

Bien cordialement,
L'équipe {{ config('app.name', 'MDW') }}
@endcomponent
