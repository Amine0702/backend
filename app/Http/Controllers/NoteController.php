<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class NoteController extends Controller
{
    /**
     * Récupérer toutes les notes d'un utilisateur
     */
    public function getUserNotes(Request $request, $clerkUserId)
    {
        try {
            // Trouver l'utilisateur par son ID Clerk
            $user = User::where('clerk_user_id', $clerkUserId)->first();

            // Ajouter des logs pour le débogage
            Log::info('Recherche de notes pour Clerk ID: ' . $clerkUserId);
            if ($user) {
                Log::info('Utilisateur trouvé avec ID: ' . $user->id);
            } else {
                Log::warning('Aucun utilisateur trouvé pour Clerk ID: ' . $clerkUserId);
            }

            if (!$user) {
                // Si l'utilisateur n'existe pas, retourner un tableau vide plutôt qu'une erreur
                Log::info('Utilisateur non trouvé pour Clerk ID: ' . $clerkUserId);
                return response()->json([]);
            }

            // Récupérer les notes de l'utilisateur
            $notes = Note::where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('Nombre de notes trouvées: ' . $notes->count());

            return response()->json($notes);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des notes: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Créer une nouvelle note
     */
    public function store(Request $request)
    {
        try {
            // Valider les données
            $validator = Validator::make($request->all(), [
                'clerkUserId' => 'required|string',
                'content' => 'required|string',
                'category' => 'required|string',
                'priority' => 'required|string|in:High,Medium,Low',
                'status' => 'required|string|in:New,In Progress,Pending,Completed',
                'color' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Trouver l'utilisateur par son ID Clerk
            $user = User::where('clerk_user_id', $request->clerkUserId)->first();

            if (!$user) {
                // Si l'utilisateur n'existe pas, créer un utilisateur temporaire
                Log::info('Création d\'un utilisateur temporaire pour Clerk ID: ' . $request->clerkUserId);
                $user = User::create([
                    'name' => 'Utilisateur Temporaire',
                    'email' => $request->clerkUserId . '@temp.com',
                    'clerk_user_id' => $request->clerkUserId,
                    'role' => 'user'
                ]);
            }

            // Créer la note
            $note = Note::create([
                'user_id' => $user->id,
                'content' => $request->content,
                'category' => $request->category,
                'priority' => $request->priority,
                'status' => $request->status,
                'color' => $request->color,
            ]);

            return response()->json($note, 201);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la création de la note: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Mettre à jour une note
     */
    public function update(Request $request, $id)
    {
        try {
            // Trouver la note
            $note = Note::find($id);

            if (!$note) {
                return response()->json(['message' => 'Note non trouvée'], 404);
            }

            // Ajouter des logs pour le débogage
            Log::info('Mise à jour de la note ID: ' . $id);
            Log::info('Données reçues: ', $request->all());

            // Valider les données
            $validator = Validator::make($request->all(), [
                'content' => 'sometimes|string',
                'category' => 'sometimes|string',
                'priority' => 'sometimes|string|in:High,Medium,Low',
                'status' => 'sometimes|string|in:New,In Progress,Pending,Completed',
                'color' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                Log::error('Validation échouée: ' . json_encode($validator->errors()));
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Mettre à jour la note
            $note->update($request->only(['content', 'category', 'priority', 'status', 'color']));

            return response()->json($note);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la mise à jour de la note: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Supprimer une note
     */
    public function destroy($id)
    {
        try {
            // Ajouter des logs pour le débogage
            Log::info('Tentative de suppression de la note ID: ' . $id);
            
            // Vérifier si l'ID est valide
            if (!$id || !is_numeric($id)) {
                Log::error('ID de note invalide pour la suppression: ' . $id);
                return response()->json(['message' => 'ID de note invalide'], 400);
            }
            
            // Trouver la note
            $note = Note::find($id);

            if (!$note) {
                Log::warning('Note non trouvée pour la suppression, ID: ' . $id);
                return response()->json(['message' => 'Note non trouvée'], 404);
            }

            // Supprimer la note
            $note->delete();
            Log::info('Note supprimée avec succès, ID: ' . $id);

            return response()->json(['message' => 'Note supprimée avec succès']);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression de la note: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Rechercher des notes
     */
    public function search(Request $request, $clerkUserId)
    {
        try {
            // Trouver l'utilisateur par son ID Clerk
            $user = User::where('clerk_user_id', $clerkUserId)->first();

            if (!$user) {
                // Si l'utilisateur n'existe pas, retourner un tableau vide
                return response()->json([]);
            }

            $query = $request->query('query');
            $category = $request->query('category');
            $priority = $request->query('priority');
            $status = $request->query('status');

            // Construire la requête
            $notes = Note::where('user_id', $user->id);

            if ($query) {
                $notes->where('content', 'like', "%{$query}%");
            }

            if ($category) {
                $notes->where('category', $category);
            }

            if ($priority) {
                $notes->where('priority', $priority);
            }

            if ($status) {
                $notes->where('status', $status);
            }

            // Exécuter la requête
            $results = $notes->orderBy('created_at', 'desc')->get();

            return response()->json($results);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la recherche de notes: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
