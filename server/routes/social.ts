import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { ensureAuthenticated } from "../auth";
import { createId } from "@paralleldrive/cuid2";
import {
  addFriendSchema,
  updateFriendshipSchema,
  shareToastSchema,
  addReactionSchema,
  addCommentSchema
} from "@shared/schema";
import { z } from "zod";
import authSocialRoutes from "../routes/auth-social";

/**
 * Register social feature endpoints
 */
export function registerSocialRoutes(app: Express) {
  // Social authentication endpoints
  app.use('/api/auth', authSocialRoutes);
  
  // Friendship endpoints
  app.get("/api/friends", ensureAuthenticated, getFriends);
  app.post("/api/friends", ensureAuthenticated, addFriend);
  app.put("/api/friends/:id", ensureAuthenticated, updateFriendshipStatus);
  app.delete("/api/friends/:id", ensureAuthenticated, deleteFriendship);
  
  // Shared toast endpoints
  app.get("/api/shared-toasts", ensureAuthenticated, getSharedToasts);
  app.get("/api/shared-toasts/:code", getSharedToastByCode);
  app.post("/api/toasts/:id/share", ensureAuthenticated, shareToast);
  app.delete("/api/shared-toasts/:id", ensureAuthenticated, deleteSharedToast);
  
  // Toast reactions
  app.get("/api/toasts/:id/reactions", getToastReactions);
  app.post("/api/toasts/:id/reactions", ensureAuthenticated, addToastReaction);
  app.delete("/api/reactions/:id", ensureAuthenticated, deleteToastReaction);
  
  // Toast comments
  app.get("/api/toasts/:id/comments", getToastComments);
  app.post("/api/toasts/:id/comments", ensureAuthenticated, addToastComment);
  app.put("/api/comments/:id", ensureAuthenticated, updateToastComment);
  app.delete("/api/comments/:id", ensureAuthenticated, deleteToastComment);
}

// Friendship handlers
async function getFriends(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;
    
    const friends = await storage.getFriendsByUserId(userId, status);
    res.json(friends);
  } catch (error) {
    console.error("Error getting friends:", error);
    res.status(500).json({ message: "Failed to get friends" });
  }
}

async function addFriend(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validatedData = addFriendSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ errors: validatedData.error.errors });
    }
    
    // Get the friend's user ID from username
    const friendUsername = validatedData.data.username;
    const friend = await storage.getUserByUsername(friendUsername);
    
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Can't add yourself as a friend
    if (friend.id === userId) {
      return res.status(400).json({ message: "You cannot add yourself as a friend" });
    }
    
    // Check if friendship already exists
    const existingFriendship = await storage.getFriendshipByUserIds(userId, friend.id);
    
    if (existingFriendship) {
      return res.status(400).json({ 
        message: "Friendship already exists", 
        status: existingFriendship.status 
      });
    }
    
    // Create friendship
    const friendship = await storage.createFriendship({
      userId,
      friendId: friend.id,
      status: "pending"
    });
    
    // Send real-time notification to the friend
    if ((global as any).sendNotificationToUser) {
      (global as any).sendNotificationToUser(friend.id, {
        type: 'friendship_request',
        friendship,
        from: {
          id: userId,
          username: req.user!.username,
          name: req.user!.name
        }
      });
    }
    
    res.status(201).json(friendship);
  } catch (error) {
    console.error("Error adding friend:", error);
    res.status(500).json({ message: "Failed to add friend" });
  }
}

async function updateFriendshipStatus(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const friendshipId = parseInt(req.params.id);
    
    // Validate input
    const validatedData = updateFriendshipSchema.safeParse({
      friendshipId,
      ...req.body
    });
    
    if (!validatedData.success) {
      return res.status(400).json({ errors: validatedData.error.errors });
    }
    
    // Get the friendship
    const friendship = await storage.getFriendshipById(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found" });
    }
    
    // Only the recipient can accept/reject friend requests
    if (friendship.status === "pending" && friendship.friendId !== userId) {
      return res.status(403).json({ 
        message: "Only the recipient can update a pending friendship" 
      });
    }
    
    // User must be part of the friendship
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      return res.status(403).json({ 
        message: "You are not authorized to update this friendship" 
      });
    }
    
    // Update friendship
    const updatedFriendship = await storage.updateFriendshipStatus(
      friendshipId, 
      validatedData.data.status
    );
    
    // Get the other user's ID (the one who needs to be notified)
    const otherUserId = friendship.userId === userId ? friendship.friendId : friendship.userId;
    
    // Send real-time notification to the other user about the status change
    if ((global as any).sendNotificationToUser) {
      (global as any).sendNotificationToUser(otherUserId, {
        type: 'friendship_updated',
        friendship: updatedFriendship,
        status: validatedData.data.status,
        from: {
          id: userId,
          username: req.user!.username,
          name: req.user!.name
        }
      });
    }
    
    res.json(updatedFriendship);
  } catch (error) {
    console.error("Error updating friendship:", error);
    res.status(500).json({ message: "Failed to update friendship" });
  }
}

async function deleteFriendship(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const friendshipId = parseInt(req.params.id);
    
    // Get the friendship
    const friendship = await storage.getFriendshipById(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found" });
    }
    
    // User must be part of the friendship
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      return res.status(403).json({ 
        message: "You are not authorized to delete this friendship" 
      });
    }
    
    // Delete friendship
    await storage.deleteFriendship(friendshipId);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting friendship:", error);
    res.status(500).json({ message: "Failed to delete friendship" });
  }
}

// Shared toast handlers
async function getSharedToasts(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    
    // Get all toasts for this user
    const userToasts = await storage.getToastsByUserId(userId);
    
    // Get all shared toast records for these toasts
    const sharedToastsPromises = userToasts.map(toast => 
      storage.getSharedToastsByToastId(toast.id)
    );
    
    const sharedToastsArrays = await Promise.all(sharedToastsPromises);
    const sharedToasts = sharedToastsArrays.flat();
    
    res.json(sharedToasts);
  } catch (error) {
    console.error("Error getting shared toasts:", error);
    res.status(500).json({ message: "Failed to get shared toasts" });
  }
}

async function getSharedToastByCode(req: Request, res: Response) {
  try {
    const shareCode = req.params.code;
    
    // Get the shared toast
    const sharedToast = await storage.getSharedToastByShareCode(shareCode);
    
    if (!sharedToast) {
      return res.status(404).json({ message: "Shared toast not found" });
    }
    
    // Check if expired
    if (sharedToast.expiresAt && new Date() > new Date(sharedToast.expiresAt)) {
      return res.status(410).json({ message: "This shared toast has expired" });
    }
    
    // Get the actual toast
    const toast = await storage.getToastById(sharedToast.toastId);
    
    if (!toast) {
      return res.status(404).json({ message: "Toast not found" });
    }
    
    // Get user info
    const user = await storage.getUser(toast.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Increment view count
    await storage.incrementSharedToastViewCount(sharedToast.id);
    
    // Assemble response with user info but without sensitive data
    const response = {
      toast: {
        ...toast,
        user: {
          id: user.id,
          username: user.username,
          name: user.name
        }
      },
      sharedToast
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error getting shared toast:", error);
    res.status(500).json({ message: "Failed to get shared toast" });
  }
}

async function shareToast(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const toastId = parseInt(req.params.id);
    
    // Validate input
    const validatedData = shareToastSchema.safeParse({
      toastId,
      ...req.body
    });
    
    if (!validatedData.success) {
      return res.status(400).json({ errors: validatedData.error.errors });
    }
    
    // Get the toast
    const toast = await storage.getToastById(toastId);
    
    if (!toast) {
      return res.status(404).json({ message: "Toast not found" });
    }
    
    // Check if user owns the toast
    if (toast.userId !== userId) {
      return res.status(403).json({ message: "You can only share your own toasts" });
    }
    
    // Create a unique share code
    const shareCode = createId();
    
    // Create shared toast
    const sharedToast = await storage.createSharedToast({
      toastId,
      shareCode,
      visibility: validatedData.data.visibility || "friends-only",
      allowComments: validatedData.data.allowComments ?? true,
      expiresAt: validatedData.data.expiresAt
    });
    
    // Update the toast to mark it as shared
    await storage.updateToast(toastId, { 
      shared: true,
      shareUrl: `/shared/${shareCode}`
    });
    
    // If sharing with friends, send notifications
    if (validatedData.data.visibility === 'friends-only') {
      try {
        // Get user's friends to notify them
        const friends = await storage.getFriendsByUserId(userId, 'accepted');
        
        // Send notification to all friends
        if ((global as any).sendNotificationToUser && friends.length > 0) {
          friends.forEach(friend => {
            (global as any).sendNotificationToUser(friend.id, {
              type: 'toast_shared',
              sharedToast,
              shareCode,
              from: {
                id: userId,
                username: req.user!.username,
                name: req.user!.name
              }
            });
          });
        }
      } catch (error) {
        console.error("Error notifying friends about shared toast:", error);
        // Non-critical error, continue with the response
      }
    }
    
    res.status(201).json(sharedToast);
  } catch (error) {
    console.error("Error sharing toast:", error);
    res.status(500).json({ message: "Failed to share toast" });
  }
}

async function deleteSharedToast(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const sharedToastId = parseInt(req.params.id);
    
    // Get the shared toast
    const sharedToast = await storage.getSharedToastById(sharedToastId);
    
    if (!sharedToast) {
      return res.status(404).json({ message: "Shared toast not found" });
    }
    
    // Get the toast
    const toast = await storage.getToastById(sharedToast.toastId);
    
    if (!toast) {
      return res.status(404).json({ message: "Toast not found" });
    }
    
    // Check if user owns the toast
    if (toast.userId !== userId) {
      return res.status(403).json({ 
        message: "You can only delete shares of your own toasts" 
      });
    }
    
    // Delete shared toast
    await storage.deleteSharedToast(sharedToastId);
    
    // Check if there are any other shares for this toast
    const otherShares = await storage.getSharedToastsByToastId(toast.id);
    
    // If no other shares, update the toast's shared status
    if (otherShares.length === 0) {
      await storage.updateToast(toast.id, { 
        shared: false,
        shareUrl: null
      });
    }
    
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting shared toast:", error);
    res.status(500).json({ message: "Failed to delete shared toast" });
  }
}

// Toast reaction handlers
async function getToastReactions(req: Request, res: Response) {
  try {
    const toastId = parseInt(req.params.id);
    
    // Get the toast
    const toast = await storage.getToastById(toastId);
    
    if (!toast) {
      return res.status(404).json({ message: "Toast not found" });
    }
    
    // Check if toast is shared or if the user is the owner
    const isOwner = req.user?.id === toast.userId;
    
    if (!toast.shared && !isOwner) {
      return res.status(403).json({ 
        message: "This toast is not publicly available" 
      });
    }
    
    const reactions = await storage.getToastReactionsByToastId(toastId);
    
    // Get reaction counts by type
    const reactionCounts = reactions.reduce((counts, reaction) => {
      counts[reaction.reaction] = (counts[reaction.reaction] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // Get user's reaction if authenticated
    let userReaction = null;
    if (req.user) {
      userReaction = await storage.getToastReactionByUserAndToast(
        req.user.id, 
        toastId
      );
    }
    
    res.json({
      reactions: reactionCounts,
      total: reactions.length,
      userReaction: userReaction ? userReaction.reaction : null
    });
  } catch (error) {
    console.error("Error getting toast reactions:", error);
    res.status(500).json({ message: "Failed to get toast reactions" });
  }
}

async function addToastReaction(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const toastId = parseInt(req.params.id);
    
    // Validate input
    const validatedData = addReactionSchema.safeParse({
      toastId,
      ...req.body
    });
    
    if (!validatedData.success) {
      return res.status(400).json({ errors: validatedData.error.errors });
    }
    
    // Get the toast
    const toast = await storage.getToastById(toastId);
    
    if (!toast) {
      return res.status(404).json({ message: "Toast not found" });
    }
    
    // Check if toast is shared or if the user is the owner
    const isOwner = userId === toast.userId;
    
    if (!toast.shared && !isOwner) {
      return res.status(403).json({ 
        message: "This toast is not publicly available" 
      });
    }
    
    // Check if user already reacted
    const existingReaction = await storage.getToastReactionByUserAndToast(
      userId, 
      toastId
    );
    
    if (existingReaction) {
      // Update existing reaction
      const updatedReaction = await storage.updateToastReaction(
        existingReaction.id, 
        validatedData.data.reaction
      );
      return res.json(updatedReaction);
    }
    
    // Create new reaction
    const reaction = await storage.createToastReaction({
      toastId,
      userId,
      reaction: validatedData.data.reaction
    });
    
    res.status(201).json(reaction);
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ message: "Failed to add reaction" });
  }
}

async function deleteToastReaction(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const reactionId = parseInt(req.params.id);
    
    // Get the reaction
    const reaction = await storage.getToastReactionById(reactionId);
    
    if (!reaction) {
      return res.status(404).json({ message: "Reaction not found" });
    }
    
    // Check if user owns the reaction
    if (reaction.userId !== userId) {
      return res.status(403).json({ 
        message: "You can only delete your own reactions" 
      });
    }
    
    // Delete reaction
    await storage.deleteToastReaction(reactionId);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting reaction:", error);
    res.status(500).json({ message: "Failed to delete reaction" });
  }
}

// Toast comment handlers
async function getToastComments(req: Request, res: Response) {
  try {
    const toastId = parseInt(req.params.id);
    
    // Get the toast
    const toast = await storage.getToastById(toastId);
    
    if (!toast) {
      return res.status(404).json({ message: "Toast not found" });
    }
    
    // Check if toast is shared or if the user is the owner
    const isOwner = req.user?.id === toast.userId;
    
    if (!toast.shared && !isOwner) {
      return res.status(403).json({ 
        message: "This toast is not publicly available" 
      });
    }
    
    // Get the shared toast settings
    const [sharedToast] = await storage.getSharedToastsByToastId(toastId);
    
    if (sharedToast && !sharedToast.allowComments) {
      return res.status(403).json({ 
        message: "Comments are disabled for this toast" 
      });
    }
    
    const comments = await storage.getToastCommentsByToastId(toastId);
    
    // Get user info for each comment
    const commentsWithUserInfo = await Promise.all(
      comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        return {
          ...comment,
          user: user ? {
            id: user.id,
            username: user.username,
            name: user.name
          } : null
        };
      })
    );
    
    res.json(commentsWithUserInfo);
  } catch (error) {
    console.error("Error getting toast comments:", error);
    res.status(500).json({ message: "Failed to get toast comments" });
  }
}

async function addToastComment(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const toastId = parseInt(req.params.id);
    
    // Validate input
    const validatedData = addCommentSchema.safeParse({
      toastId,
      ...req.body
    });
    
    if (!validatedData.success) {
      return res.status(400).json({ errors: validatedData.error.errors });
    }
    
    // Get the toast
    const toast = await storage.getToastById(toastId);
    
    if (!toast) {
      return res.status(404).json({ message: "Toast not found" });
    }
    
    // Check if toast is shared or if the user is the owner
    const isOwner = userId === toast.userId;
    
    if (!toast.shared && !isOwner) {
      return res.status(403).json({ 
        message: "This toast is not publicly available" 
      });
    }
    
    // Get the shared toast settings
    const [sharedToast] = await storage.getSharedToastsByToastId(toastId);
    
    if (sharedToast && !sharedToast.allowComments) {
      return res.status(403).json({ 
        message: "Comments are disabled for this toast" 
      });
    }
    
    // Create comment
    const comment = await storage.createToastComment({
      toastId,
      userId,
      comment: validatedData.data.comment
    });
    
    // Get user info
    const user = await storage.getUser(userId);
    
    // Prepare formatted comment with user info
    const commentWithUser = {
      ...comment,
      user: {
        id: user!.id,
        username: user!.username,
        name: user!.name
      }
    };
    
    // If the commenting user is not the toast owner, notify the toast owner
    if (userId !== toast.userId && (global as any).sendNotificationToUser) {
      (global as any).sendNotificationToUser(toast.userId, {
        type: 'toast_comment',
        comment: commentWithUser,
        toastId: toast.id,
        from: {
          id: userId,
          username: user!.username,
          name: user!.name
        }
      });
    }
    
    // Return comment with user info
    res.status(201).json(commentWithUser);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
}

async function updateToastComment(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const commentId = parseInt(req.params.id);
    
    // Validate comment text
    const { comment } = req.body;
    
    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }
    
    if (comment.length > 500) {
      return res.status(400).json({ 
        message: "Comment too long (max 500 characters)" 
      });
    }
    
    // Get the comment
    const existingComment = await storage.getToastCommentById(commentId);
    
    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Check if user owns the comment
    if (existingComment.userId !== userId) {
      return res.status(403).json({ 
        message: "You can only edit your own comments" 
      });
    }
    
    // Update comment
    const updatedComment = await storage.updateToastComment(
      commentId, 
      comment
    );
    
    // Get user info
    const user = await storage.getUser(userId);
    
    // Return updated comment with user info
    res.json({
      ...updatedComment,
      user: {
        id: user!.id,
        username: user!.username,
        name: user!.name
      }
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ message: "Failed to update comment" });
  }
}

async function deleteToastComment(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const commentId = parseInt(req.params.id);
    
    // Get the comment
    const comment = await storage.getToastCommentById(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Check if user owns the comment
    if (comment.userId !== userId) {
      // Check if user owns the toast that the comment is on
      const toast = await storage.getToastById(comment.toastId);
      
      if (!toast || toast.userId !== userId) {
        return res.status(403).json({ 
          message: "You can only delete your own comments or comments on your toasts" 
        });
      }
    }
    
    // Delete comment
    await storage.deleteToastComment(commentId);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
}