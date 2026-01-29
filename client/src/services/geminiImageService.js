import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Generate images using Gemini API
 * @param {File} imageFile - The image file to use as reference
 * @param {string} subcategoryId - The subcategory ID to get prompts from
 * @returns {Promise} Response with generated images
 */
export const generateImages = async (imageFile, subcategoryId) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('subcategoryId', subcategoryId);
    
    const response = await axios.post(
      `${API_BASE_URL}/gemini/generate-images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout for image generation
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error generating images:', error);
    throw new Error(
      error.response?.data?.error || 
      error.response?.data?.message || 
      'Failed to generate images'
    );
  }
};

/**
 * Get image generation prompts for a subcategory
 * @param {string} subcategoryId - The subcategory ID
 * @returns {Promise} Response with prompts array
 */
export const getImagePrompts = async (subcategoryId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/subcategories/${subcategoryId}/image-prompts`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching image prompts:', error);
    throw new Error(
      error.response?.data?.error || 
      'Failed to fetch image prompts'
    );
  }
};

/**
 * Update image generation prompts for a subcategory
 * @param {string} subcategoryId - The subcategory ID
 * @param {Array} prompts - Array of prompt objects with type, prompt, and order
 * @returns {Promise} Response with updated prompts
 */
export const updateImagePrompts = async (subcategoryId, prompts) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/subcategories/${subcategoryId}/image-prompts`,
      { prompts }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating image prompts:', error);
    throw new Error(
      error.response?.data?.error || 
      'Failed to update image prompts'
    );
  }
};

/**
 * Add a single image generation prompt to a subcategory
 * @param {string} subcategoryId - The subcategory ID
 * @param {Object} prompt - Prompt object with type, prompt, and order
 * @returns {Promise} Response with added prompt
 */
export const addImagePrompt = async (subcategoryId, prompt) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/subcategories/${subcategoryId}/image-prompts`,
      prompt
    );
    return response.data;
  } catch (error) {
    console.error('Error adding image prompt:', error);
    throw new Error(
      error.response?.data?.error || 
      'Failed to add image prompt'
    );
  }
};

/**
 * Delete an image generation prompt from a subcategory
 * @param {string} subcategoryId - The subcategory ID
 * @param {string} promptId - The prompt ID to delete
 * @returns {Promise} Response with success message
 */
export const deleteImagePrompt = async (subcategoryId, promptId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/subcategories/${subcategoryId}/image-prompts/${promptId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting image prompt:', error);
    throw new Error(
      error.response?.data?.error || 
      'Failed to delete image prompt'
    );
  }
};

export default {
  generateImages,
  getImagePrompts,
  updateImagePrompts,
  addImagePrompt,
  deleteImagePrompt
};

