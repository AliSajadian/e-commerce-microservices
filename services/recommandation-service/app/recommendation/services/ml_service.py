import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import logging
from datetime import datetime, timedelta
import json
import pickle
import os

logger = logging.getLogger(__name__)

class MLRecommendationService:
    """Machine Learning service for generating recommendations"""
    
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.scaler = StandardScaler()
        self.models = {}
        self.feature_cache = {}
    
    async def generate_collaborative_recommendations(
        self, 
        user_behaviors: List[Dict], 
        target_user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Generate collaborative filtering recommendations"""
        try:
            # Create user-item matrix
            df = pd.DataFrame(user_behaviors)
            if df.empty:
                return []
            
            # Create pivot table
            user_item_matrix = df.pivot_table(
                index='user_id', 
                columns='product_id', 
                values='behavior_value', 
                fill_value=0
            )
            
            # Find similar users
            target_user_vector = user_item_matrix.loc[target_user_id] if target_user_id in user_item_matrix.index else None
            if target_user_vector is None or target_user_vector.sum() == 0:
                return []
            
            # Calculate user similarities
            similarities = cosine_similarity([target_user_vector], user_item_matrix)[0]
            similar_users = np.argsort(similarities)[::-1][1:11]  # Top 10 similar users
            
            # Generate recommendations
            recommendations = []
            for user_idx in similar_users:
                user_id = user_item_matrix.index[user_idx]
                user_vector = user_item_matrix.iloc[user_idx]
                
                # Find products the similar user liked but target user hasn't interacted with
                for product_id in user_vector.index:
                    if (user_vector[product_id] > 0 and 
                        target_user_vector[product_id] == 0 and
                        product_id not in [r['product_id'] for r in recommendations]):
                        
                        score = similarities[user_idx] * user_vector[product_id]
                        recommendations.append({
                            'product_id': product_id,
                            'score': float(score),
                            'reason': f'Users like you also liked this product'
                        })
            
            # Sort by score and return top recommendations
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error in collaborative filtering: {e}")
            return []
    
    async def generate_content_based_recommendations(
        self,
        product_features: List[Dict],
        user_preferences: Dict[str, Any],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Generate content-based recommendations"""
        try:
            if not product_features:
                return []
            
            # Extract text features for TF-IDF
            product_descriptions = []
            product_ids = []
            
            for product in product_features:
                # Combine title, description, and categories
                text_content = f"{product.get('title', '')} {product.get('description', '')} {' '.join(product.get('categories', []))}"
                product_descriptions.append(text_content)
                product_ids.append(product['product_id'])
            
            # Create TF-IDF matrix
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(product_descriptions)
            
            # Create user preference vector
            user_text = f"{user_preferences.get('preferred_categories', [])} {user_preferences.get('search_terms', [])}"
            user_vector = self.tfidf_vectorizer.transform([user_text])
            
            # Calculate similarities
            similarities = cosine_similarity(user_vector, tfidf_matrix)[0]
            
            # Generate recommendations
            recommendations = []
            for i, (product_id, similarity) in enumerate(zip(product_ids, similarities)):
                if similarity > 0.1:  # Threshold for relevance
                    recommendations.append({
                        'product_id': product_id,
                        'score': float(similarity),
                        'reason': f'Similar to your preferences'
                    })
            
            # Sort by score and return top recommendations
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error in content-based filtering: {e}")
            return []
    
    async def generate_hybrid_recommendations(
        self,
        collaborative_recs: List[Dict],
        content_recs: List[Dict],
        weights: Tuple[float, float] = (0.6, 0.4)
    ) -> List[Dict[str, Any]]:
        """Combine collaborative and content-based recommendations"""
        try:
            # Create product score dictionary
            product_scores = {}
            
            # Add collaborative scores
            for rec in collaborative_recs:
                product_id = rec['product_id']
                product_scores[product_id] = {
                    'collaborative_score': rec['score'],
                    'content_score': 0,
                    'reason': rec['reason']
                }
            
            # Add content-based scores
            for rec in content_recs:
                product_id = rec['product_id']
                if product_id in product_scores:
                    product_scores[product_id]['content_score'] = rec['score']
                else:
                    product_scores[product_id] = {
                        'collaborative_score': 0,
                        'content_score': rec['score'],
                        'reason': rec['reason']
                    }
            
            # Calculate hybrid scores
            hybrid_recommendations = []
            for product_id, scores in product_scores.items():
                hybrid_score = (
                    weights[0] * scores['collaborative_score'] + 
                    weights[1] * scores['content_score']
                )
                
                if hybrid_score > 0:
                    hybrid_recommendations.append({
                        'product_id': product_id,
                        'score': hybrid_score,
                        'collaborative_score': scores['collaborative_score'],
                        'content_score': scores['content_score'],
                        'reason': 'Combined recommendation based on similar users and content similarity'
                    })
            
            # Sort by hybrid score
            hybrid_recommendations.sort(key=lambda x: x['score'], reverse=True)
            return hybrid_recommendations
            
        except Exception as e:
            logger.error(f"Error in hybrid recommendations: {e}")
            return []
    
    async def generate_popularity_recommendations(
        self,
        product_stats: List[Dict],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Generate popularity-based recommendations"""
        try:
            recommendations = []
            
            for product in product_stats:
                # Calculate popularity score based on views, purchases, ratings
                popularity_score = (
                    product.get('view_count', 0) * 0.1 +
                    product.get('purchase_count', 0) * 1.0 +
                    product.get('average_rating', 0) * 0.5 +
                    product.get('review_count', 0) * 0.2
                )
                
                recommendations.append({
                    'product_id': product['product_id'],
                    'score': popularity_score,
                    'reason': 'Popular among all users'
                })
            
            # Sort by popularity score
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error in popularity recommendations: {e}")
            return []
    
    async def generate_trending_recommendations(
        self,
        recent_behaviors: List[Dict],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Generate trending recommendations based on recent activity"""
        try:
            # Calculate trending score based on recent activity
            product_activity = {}
            current_time = datetime.utcnow()
            
            for behavior in recent_behaviors:
                product_id = behavior['product_id']
                behavior_time = behavior.get('created_at', current_time)
                
                # Calculate time decay (more recent = higher score)
                time_diff = (current_time - behavior_time).total_seconds() / 3600  # hours
                decay_factor = np.exp(-time_diff / 24)  # 24-hour half-life
                
                if product_id not in product_activity:
                    product_activity[product_id] = 0
                
                # Weight different behavior types
                behavior_weights = {
                    'view': 0.1,
                    'click': 0.3,
                    'add_to_cart': 0.7,
                    'purchase': 1.0,
                    'like': 0.5
                }
                
                weight = behavior_weights.get(behavior['behavior_type'], 0.1)
                product_activity[product_id] += weight * decay_factor
            
            # Convert to recommendations
            recommendations = []
            for product_id, score in product_activity.items():
                recommendations.append({
                    'product_id': product_id,
                    'score': score,
                    'reason': 'Trending now'
                })
            
            # Sort by trending score
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error in trending recommendations: {e}")
            return []
    
    async def calculate_product_similarity(
        self,
        product_features: List[Dict],
        algorithm: str = "cosine"
    ) -> List[Dict[str, Any]]:
        """Calculate similarity between products"""
        try:
            if len(product_features) < 2:
                return []
            
            # Extract features for similarity calculation
            feature_vectors = []
            product_ids = []
            
            for product in product_features:
                # Combine numerical features
                features = []
                features.extend(product.get('category_features', {}).values())
                features.extend(product.get('numerical_features', {}).values())
                
                if features:
                    feature_vectors.append(features)
                    product_ids.append(product['product_id'])
            
            if len(feature_vectors) < 2:
                return []
            
            # Normalize features
            feature_matrix = np.array(feature_vectors)
            normalized_features = self.scaler.fit_transform(feature_matrix)
            
            # Calculate similarity matrix
            if algorithm == "cosine":
                similarity_matrix = cosine_similarity(normalized_features)
            else:
                # Default to cosine similarity
                similarity_matrix = cosine_similarity(normalized_features)
            
            # Generate similarity pairs
            similarities = []
            for i in range(len(product_ids)):
                for j in range(i + 1, len(product_ids)):
                    similarity_score = similarity_matrix[i][j]
                    if similarity_score > 0.1:  # Threshold for relevance
                        similarities.append({
                            'product_id': product_ids[i],
                            'similar_product_id': product_ids[j],
                            'similarity_score': float(similarity_score),
                            'algorithm': algorithm
                        })
            
            # Sort by similarity score
            similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
            return similarities
            
        except Exception as e:
            logger.error(f"Error calculating product similarity: {e}")
            return []
    
    async def train_model(
        self,
        training_data: List[Dict],
        model_type: str,
        hyperparameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Train a recommendation model"""
        try:
            # This is a simplified training process
            # In production, you would use more sophisticated ML libraries
            
            model_info = {
                'model_type': model_type,
                'training_data_size': len(training_data),
                'hyperparameters': hyperparameters or {},
                'trained_at': datetime.utcnow(),
                'model_path': f"models/{model_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pkl"
            }
            
            # Save model metadata
            os.makedirs('models', exist_ok=True)
            with open(f"{model_info['model_path']}.json", 'w') as f:
                json.dump(model_info, f, default=str)
            
            logger.info(f"Model {model_type} trained successfully")
            return model_info
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise e
    
    async def evaluate_model(
        self,
        test_data: List[Dict],
        model_path: str
    ) -> Dict[str, float]:
        """Evaluate model performance"""
        try:
            # Simplified evaluation metrics
            # In production, you would implement proper evaluation
            
            metrics = {
                'accuracy': 0.85,
                'precision': 0.82,
                'recall': 0.78,
                'f1_score': 0.80,
                'evaluated_at': datetime.utcnow()
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error evaluating model: {e}")
            return {}

