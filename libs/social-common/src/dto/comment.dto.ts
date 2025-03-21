export interface CommentAddDTO {
    _id?: String;
    entityGroup: String;
    mainEntityName: String;
    mainEntityId: String;
    childEntityName?: String;
    childEntityId?: String;
    textContent: String;
    childOfCommentId?: string;
}

export interface BanUserDTO {
    entityGroup: string;
    mainEntityName: string;
    mainEntityId: string;
    byUserId: string;
}

export interface CommentMetaSearchDTO {
    entityGroup: String;
    mainEntityName: String;
    mainEntityId: String;
}

export interface CommentSearchDTO {
    entityGroup: String;
    mainEntityName: String;
    mainEntityId: String;
    childEntityName?: String;
    childEntityId?: String;
    childOfCommentId?: string;
}

export interface CommentDTO {
    _id: String;

    entityGroup: String;

    mainEntityName: String;

    mainEntityId: String;

    childEntityName: String;

    childEntityId: String;

    textContent: String;

    byUserId: String;

    byFullName: String;

    creationDate: Date;

    lastEditDate: Date;

    editCount: number;

    isChild?: boolean;

    childOfCommentId?: string;

    userDownVoted: boolean;

    userUpVoted: boolean;

    votesLength: number;

    childCommentsCount: number;

    canRemove: boolean;
    canEdit: boolean;
    userCommentAdmin: boolean;
    userBanned: boolean;
}

export interface CommentAbilityDTO {
    userCanComment: boolean;
    userCommentBlockReason: string;
    extraNote?: string;
}

export interface CommentEditDTO {
    textContent: String;
}

export interface CanManuplateComment {
    // entityOwnership: EntityOwnershipDTO;
    allow: boolean;
}

export type SORT_FIELD = 'VOTE' | 'CREATIONDATE';
export type SORT_ROTATION = 'ASC' | 'DESC';

export interface PaginationRequest {
    page: number;
    size: number;
    sortField: SORT_FIELD;
    sortRotation: SORT_ROTATION;
}

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
