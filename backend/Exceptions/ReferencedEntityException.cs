using System;

namespace backend.Exceptions;

public class ReferencedEntityException : Exception
{
    public ReferencedEntityException(string message) : base(message)
    {
    }
}
