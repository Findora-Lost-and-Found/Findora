import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { claimsAPI } from '../services/api';
import './ClaimModal.css';
import NICClaim from './claims/NICClaim';
import IDClaim from './claims/IDClaim';
import BankCardClaim from './claims/BankCardClaim';
import PurseClaim from './claims/PurseClaim';
import OtherItemClaim from './claims/OtherItemClaim';
import OTPDisplay from './OTPDisplay';

const ClaimModal = ({ isOpen, onClose, item }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('select'); // select, form, otp
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [claimData, setClaimData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleClaimSubmit = async (userData) => {
    const itemId = userData?.itemId || item?.id;
    if (!itemId) {
      toast.error('Unable to submit claim. Missing item ID.');
      return;
    }

    const { itemId: _itemId, ...claimMeta } = userData || {};

    setSubmitting(true);
    try {
      const response = await claimsAPI.create(itemId, Object.keys(claimMeta).length > 0 ? claimMeta : undefined);
      const createdClaimId = response.data?.claim?.id;
      const apiOtp = response.data?.otp || response.data?.claim?.otp;
      setClaimData(userData);

      // Backward-compatible path: some claim modes may still issue OTP immediately.
      if (apiOtp) {
        setGeneratedOTP(String(apiOtp));
        setCurrentStep('otp');
      } else {
        toast.success(response.data?.message || 'Claim submitted successfully. Generate OTP from My Claims.');
        onClose();
        navigate(createdClaimId ? `/my-claims?claimId=${createdClaimId}` : '/my-claims');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit claim';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryComponent = () => {
    switch (item.category?.toLowerCase()) {
      case 'nic':
        return (
          <NICClaim
            item={item}
            onSubmit={handleClaimSubmit}
            onCancel={() => setCurrentStep('select')}
          />
        );
      case 'student id':
      case 'staff id':
        return (
          <IDClaim
            item={item}
            idType={item.category}
            onSubmit={handleClaimSubmit}
            onCancel={() => setCurrentStep('select')}
          />
        );
      case 'bank cards':
      case 'bank card':
        return (
          <BankCardClaim
            item={item}
            onSubmit={handleClaimSubmit}
            onCancel={() => setCurrentStep('select')}
          />
        );
      case 'purse':
      case 'wallet':
      case 'purse / wallet':
        return (
          <PurseClaim
            item={item}
            onSubmit={handleClaimSubmit}
            onCancel={() => setCurrentStep('select')}
          />
        );
      default:
        return (
          <OtherItemClaim
            item={item}
            onSubmit={handleClaimSubmit}
            onCancel={() => setCurrentStep('select')}
          />
        );
    }
  };

  const modalContent = (
    <>
      <div className="claim-modal-backdrop" onClick={onClose}></div>

      <div className="claim-modal" role="dialog" aria-modal="true" aria-label="Claim item form">
        <div className="modal-header">
          <h2>Claim Item</h2>
          <button className="claim-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {currentStep === 'select' && (
            <div className="category-form">
              <h3>Item: {item.name}</h3>
              <p className="category-desc">Preparing claim form for {item.category}</p>
              <button
                onClick={() => setCurrentStep('form')}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Continue to Claim'}
              </button>
            </div>
          )}

          {currentStep === 'form' && getCategoryComponent()}

          {currentStep === 'otp' && (
            <OTPDisplay
              otp={generatedOTP}
              category={item.category}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default ClaimModal;
