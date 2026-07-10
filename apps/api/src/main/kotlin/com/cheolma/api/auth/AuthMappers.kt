package com.cheolma.api.auth

import com.cheolma.api.post.Author

fun User.toProfile() = UserProfileResponse(
    id = requireNotNull(id),
    email = email,
    name = name,
    verified = verified,
    profileImageUrl = profileImageUrl,
    notifyEventUpdates = notifyEventUpdates,
    role = role,
    praiseRole = praiseRole,
    praiseParts = praiseParts.orEmpty(),
    twoFactorEnabled = totpEnabled,
)

fun User.toAuthorSnapshot() = Author(
    name = name,
    verified = verified,
    profileImageUrl = profileImageUrl,
)

fun User.toAuthResponse(token: String) = AuthResponse(token = token, name = name, verified = verified)
