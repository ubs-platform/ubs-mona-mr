export interface CommentAddDTO {
    _id?: string;
    entityGroup: string;
    mainEntityName: string;
    mainEntityId: string;
    childEntityName?: string;
    childEntityId?: string;
    textContent: string;
    childOfCommentId?: string;
}

export interface BanUserDTO {
    entityGroup: string;
    mainEntityName: string;
    mainEntityId: string;
    byUserId: string;
}

export interface CommentMetaSearchDTO {
    entityGroup: string;
    mainEntityName?: string;
    mainEntityId?: string;
}

export interface CommentSearchDTO {
    entityGroup: string;
    mainEntityName?: string;
    mainEntityId?: string;
    mainEntityIdByOwner?: boolean;
    // mainEntityCurrentUserCapacities?: string[];
    childEntityName?: string;
    childEntityId?: string;
    childOfCommentId?: string;
    contentTextIn?: string;
}

export interface CommentDTO {
    _id: string;

    entityGroup: string;

    mainEntityName: string;

    mainEntityId: string;

    childEntityName: string;

    childEntityId: string;

    textContent: string;

    byUserId: string;

    byFullName: string;

    creationDate: Date;

    lastEditDate: Date;

    editCount: number;

    isChild?: boolean;

    childOfCommentId?: string;

    userDownVoted: boolean;

    userUpVoted: boolean;

    votesLength: number;

    childCommentsCount: number;

    userBanned: boolean;

    commenterIpAddress: string;
}

export interface CommentAbilityDTO {
    userCanComment: boolean;
    userCommentBlockReason: string;
    extraNote?: string;
}

export interface ExistCommentAbilityDTO {
    canRemove: boolean;
    canEdit: boolean;
    userCommentAdmin: boolean;
}

export interface CommentEditDTO {
    textContent: string;
}

export interface CanManuplateComment {
    // entityOwnership: EntityOwnershipDTO;
    allow: boolean;
}

export type SORT_FIELD = 'vote' | 'creationDate';
export type SORT_ROTATION = 'asc' | 'desc';

// export interface PaginationRequest {
//     page: number;
//     size: number;
//     sortField: SORT_FIELD;
//     sortRotation: SORT_ROTATION;
// }

// export interface PaginationResult {
//     page: number;
//     size: number;
//     maxItemLength: number;
//     list: CommentDTO[];
// }

export type CommentStatus = 'ALLOW' | 'DISABLE' | 'ARCHIVE';

export type NewCommentingStatus = CommentMetaSearchDTO & {
    newStatus: 'ALLOW' | 'DISABLE' | 'ARCHIVE';
};
