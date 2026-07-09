package com.dasida.api.auth

import com.dasida.api.post.Author

fun User.toProfile() = UserProfileResponse(
    id = requireNotNull(id),
    email = email,
    name = name,
    verified = verified,
    profileImageUrl = profileImageUrl,
    notifyCampaignUpdates = notifyCampaignUpdates,
    role = role,
    praiseRole = praiseRole,
    praiseParts = praiseParts.orEmpty(),
)

fun User.toAuthorSnapshot() = Author(
    name = name,
    verified = verified,
    profileImageUrl = profileImageUrl,
)

fun User.toAuthResponse(token: String) = AuthResponse(token = token, name = name, verified = verified)
