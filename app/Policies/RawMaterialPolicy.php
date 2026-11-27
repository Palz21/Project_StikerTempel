<?php

namespace App\Policies;

use App\Models\RawMaterial;
use App\Models\User;

class RawMaterialPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    public function view(User $user, RawMaterial $rawMaterial): bool
    {
        return $user->is_active;
    }

    public function create(User $user): bool
    {
        return $user->is_active;
    }

    public function update(User $user, RawMaterial $rawMaterial): bool
    {
        return $user->is_active;
    }

    public function delete(User $user, RawMaterial $rawMaterial): bool
    {
        return $user->is_active && $user->isOwner();
    }
}
